import type { AspectRatio, TimelineClip, TimelineAudioClip, TimelineTrack } from '../types/editor';
import { type ClipSchedule, computeTimelineSchedule, getPlaybackStateAtTime } from '../utils/timeline';
import { VideoRenderer, type DrawableMedia } from './VideoRenderer';

export interface PlaybackListener {
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

export class PlaybackController {
  private renderer: VideoRenderer;
  // Keyed by clip.id to isolate playback state and avoid collisions when multiple clips share a source file
  private videoCache: Map<string, HTMLVideoElement> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  // Keyed by clip.id
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  // Multi-track schedules: trackId -> ClipSchedule[]
  private trackSchedules: Map<string, ClipSchedule[]> = new Map();
  private videoTrackOrder: string[] = [];
  private audioClips: TimelineAudioClip[] = [];
  private totalDuration: number = 0;

  // Master timeline clock
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private lastUiNotifyTime: number = 0;

  private aspectRatio: AspectRatio = '16:9';
  private fitMode: 'contain' | 'cover' = 'contain';

  private listeners: Set<PlaybackListener> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new VideoRenderer(canvas);
    this.updateCanvasDimensions();
  }

  public subscribe(listener: PlaybackListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyTime(time: number, force = false) {
    const now = performance.now();
    if (force || now - this.lastUiNotifyTime >= 33) {
      this.lastUiNotifyTime = now;
      this.listeners.forEach((l) => l.onTimeUpdate(time));
    }
  }

  private notifyPlayState(playing: boolean) {
    this.listeners.forEach((l) => l.onPlayStateChange(playing));
  }

  public setAspectRatio(ratio: AspectRatio) {
    this.aspectRatio = ratio;
    this.updateCanvasDimensions();
    this.renderCurrentFrame();
  }

  public setFitMode(mode: 'contain' | 'cover') {
    this.fitMode = mode;
    this.renderCurrentFrame();
  }

  public updateCanvasDimensions() {
    if (this.aspectRatio === '9:16') {
      this.renderer.resize(1080, 1920);
    } else {
      this.renderer.resize(1920, 1080);
    }
  }

  public setTimeline(
    clips: TimelineClip[],
    audioClips: TimelineAudioClip[] = [],
    tracks?: TimelineTrack[]
  ) {
    this.audioClips = audioClips;
    this.trackSchedules.clear();

    const videoTracks = tracks ? tracks.filter((t) => t.type === 'video') : [];
    const fallbackTrackId = videoTracks[0]?.id || 'video-1';

    if (videoTracks.length > 0) {
      this.videoTrackOrder = videoTracks.map((t) => t.id);
      for (const vt of videoTracks) {
        const trackClips = clips.filter((c) => (c.trackId || fallbackTrackId) === vt.id);
        const { schedule } = computeTimelineSchedule(trackClips);
        this.trackSchedules.set(vt.id, schedule);
      }
    } else {
      this.videoTrackOrder = [fallbackTrackId];
      const { schedule } = computeTimelineSchedule(clips);
      this.trackSchedules.set(fallbackTrackId, schedule);
    }

    // Calculate maximum duration across all video tracks and audio clips
    let maxDur = 0;
    for (const sched of this.trackSchedules.values()) {
      if (sched.length > 0) {
        const end = sched[sched.length - 1].endTime;
        if (end > maxDur) maxDur = end;
      }
    }
    for (const aClip of audioClips) {
      const aEnd = (aClip.startTime || 0) + (aClip.trimEnd - aClip.trimStart);
      if (aEnd > maxDur) maxDur = aEnd;
    }
    this.totalDuration = maxDur;

    // Preload media
    clips.forEach((c) => {
      this.getMediaElement(c);
    });
    audioClips.forEach((a) => {
      this.getAudioElement(a);
    });

    // Clean up stale video elements
    const validClipIds = new Set(clips.map((c) => c.id));
    for (const [id, video] of this.videoCache.entries()) {
      if (!validClipIds.has(id)) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        this.videoCache.delete(id);
      }
    }

    // Clean up stale audio elements
    const validAudioIds = new Set(audioClips.map((a) => a.id));
    for (const [id, audio] of this.audioCache.entries()) {
      if (!validAudioIds.has(id)) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        this.audioCache.delete(id);
      }
    }

    if (this.currentTime > this.totalDuration) {
      this.currentTime = Math.max(0, this.totalDuration);
      this.notifyTime(this.currentTime, true);
    }

    if (!this.isPlaying) {
      this.renderCurrentFrame();
    }
  }

  public isImageSource(url: string, type?: string): boolean {
    if (type === 'image') return true;
    const lower = url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif');
  }

  public getMediaElement(clip: TimelineClip): DrawableMedia {
    const url = clip.sourceUrl;
    if (this.isImageSource(url, clip.type)) {
      let img = this.imageCache.get(url);
      if (!img) {
        img = new Image();
        img.src = url;
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (!this.isPlaying) this.renderCurrentFrame();
        };
        this.imageCache.set(url, img);
      }
      return img;
    }

    let video = this.videoCache.get(clip.id);
    if (!video) {
      video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.playsInline = true;
      video.muted = false;

      video.addEventListener('seeked', () => {
        if (!this.isPlaying) {
          this.renderCurrentFrame();
        }
      });

      video.addEventListener('loadeddata', () => {
        if (!this.isPlaying) {
          this.renderCurrentFrame();
        }
      });

      video.addEventListener('canplay', () => {
        if (!this.isPlaying) {
          this.renderCurrentFrame();
        }
      });

      this.videoCache.set(clip.id, video);
    } else if (video.src !== url) {
      video.src = url;
      video.load();
    }
    return video;
  }

  public getAudioElement(clip: TimelineAudioClip): HTMLAudioElement {
    let audio = this.audioCache.get(clip.id);
    if (!audio) {
      audio = new Audio();
      audio.src = clip.sourceUrl;
      audio.preload = 'auto';
      this.audioCache.set(clip.id, audio);
    } else if (audio.src !== clip.sourceUrl) {
      audio.src = clip.sourceUrl;
      audio.load();
    }
    return audio;
  }

  public play() {
    if (this.totalDuration <= 0) return;
    if (this.currentTime >= this.totalDuration - 0.05) {
      this.currentTime = 0;
      this.seek(0);
    }

    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.notifyPlayState(true);

    this.syncMediaElements(true, true);
    this.syncAudioTrack(true);

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public pause() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.videoCache.forEach((v) => {
      if (!v.paused) v.pause();
    });
    this.audioCache.forEach((a) => {
      if (!a.paused) a.pause();
    });

    this.notifyPlayState(false);
    this.notifyTime(this.currentTime, true);
    this.renderCurrentFrame();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(time: number) {
    this.currentTime = Math.max(0, Math.min(time, this.totalDuration));
    this.lastFrameTime = performance.now();
    this.notifyTime(this.currentTime, true);

    this.syncMediaElements(this.isPlaying, true);
    this.syncAudioTrack(this.isPlaying);
    this.renderCurrentFrame();
  }

  public stepFrames(seconds: number) {
    this.pause();
    this.seek(this.currentTime + seconds);
  }

  private syncMediaElements(shouldPlay: boolean, forceSeek = false) {
    const activeVideos = new Set<HTMLVideoElement>();

    for (const trackId of this.videoTrackOrder) {
      const schedule = this.trackSchedules.get(trackId);
      if (!schedule || schedule.length === 0) continue;

      const state = getPlaybackStateAtTime(schedule, this.currentTime);

      if (state.currentScheduleItem) {
        const clipA = state.currentScheduleItem.clip;
        const mediaA = this.getMediaElement(clipA);

        if (mediaA instanceof HTMLVideoElement) {
          activeVideos.add(mediaA);

          const targetTimeA = state.currentClipTime;
          const drift = Math.abs(mediaA.currentTime - targetTimeA);

          if (forceSeek || (!mediaA.seeking && drift > 0.35) || mediaA.ended) {
            mediaA.currentTime = targetTimeA;
          }

          const baseVolA = clipA.isMuted ? 0 : (clipA.volume ?? 1);
          if (state.transitionProgress >= 0) {
            const vol = Math.max(0, Math.min(1, baseVolA * (1 - state.transitionProgress)));
            mediaA.volume = vol;
            mediaA.muted = clipA.isMuted || vol === 0;
          } else {
            mediaA.volume = Math.max(0, Math.min(1, baseVolA));
            mediaA.muted = clipA.isMuted || baseVolA === 0;
          }

          if (shouldPlay && mediaA.paused) {
            mediaA.play().catch(() => {});
          }
        }
      }

      if (state.nextScheduleItem && state.transitionProgress >= 0) {
        const clipB = state.nextScheduleItem.clip;
        const mediaB = this.getMediaElement(clipB);

        if (mediaB instanceof HTMLVideoElement) {
          activeVideos.add(mediaB);

          const targetTimeB = state.nextClipTime;
          const driftB = Math.abs(mediaB.currentTime - targetTimeB);

          if (forceSeek || (!mediaB.seeking && driftB > 0.35) || mediaB.ended) {
            mediaB.currentTime = targetTimeB;
          }

          const baseVolB = clipB.isMuted ? 0 : (clipB.volume ?? 1);
          const volB = Math.max(0, Math.min(1, baseVolB * state.transitionProgress));
          mediaB.volume = volB;
          mediaB.muted = clipB.isMuted || volB === 0;

          if (shouldPlay && mediaB.paused) {
            mediaB.play().catch(() => {});
          }
        }
      }
    }

    // Pause all video elements not active in any track
    this.videoCache.forEach((video) => {
      if (!activeVideos.has(video) && !video.paused) {
        video.pause();
      }
    });
  }

  private syncAudioTrack(shouldPlay: boolean) {
    const activeAudios = new Set<HTMLAudioElement>();

    for (const aClip of this.audioClips) {
      const aStart = aClip.startTime || 0;
      const aDur = Math.max(0.1, aClip.trimEnd - aClip.trimStart);
      const aEnd = aStart + aDur;

      if (this.currentTime >= aStart && this.currentTime <= aEnd) {
        const audio = this.getAudioElement(aClip);
        activeAudios.add(audio);

        const targetOffset = aClip.trimStart + (this.currentTime - aStart);
        if (Math.abs(audio.currentTime - targetOffset) > 0.25) {
          audio.currentTime = targetOffset;
        }

        const vol = aClip.isMuted ? 0 : Math.max(0, Math.min(1, aClip.volume ?? 1));
        audio.volume = vol;
        audio.muted = aClip.isMuted || vol === 0;

        if (shouldPlay && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    }

    this.audioCache.forEach((audio) => {
      if (!activeAudios.has(audio) && !audio.paused) {
        audio.pause();
      }
    });
  }

  private loop = () => {
    if (!this.isPlaying) return;

    // Wait if any active video element is still seeking or buffering initial data
    for (const trackId of this.videoTrackOrder) {
      const schedule = this.trackSchedules.get(trackId);
      if (!schedule || schedule.length === 0) continue;
      const state = getPlaybackStateAtTime(schedule, this.currentTime);
      if (state.currentScheduleItem) {
        const media = this.getMediaElement(state.currentScheduleItem.clip);
        if (media instanceof HTMLVideoElement) {
          if (media.seeking || (media.readyState < 2 && !media.ended)) {
            this.lastFrameTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this.loop);
            return;
          }
        }
      }
    }

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // Master clock smoothly advances forward
    this.currentTime += dt;

    if (this.currentTime >= this.totalDuration) {
      this.currentTime = this.totalDuration;
      this.pause();
      return;
    }

    this.syncMediaElements(true, false);
    this.syncAudioTrack(true);
    this.notifyTime(this.currentTime);
    this.renderCurrentFrame();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public renderCurrentFrame() {
    if (this.totalDuration <= 0 || this.trackSchedules.size === 0) {
      this.renderer.clear();
      return;
    }

    let isFirstTrack = true;
    let anyDrawn = false;

    const options = {
      aspectRatio: this.aspectRatio,
      fitMode: this.fitMode,
    };

    for (const trackId of this.videoTrackOrder) {
      const schedule = this.trackSchedules.get(trackId);
      if (!schedule || schedule.length === 0) continue;

      const state = getPlaybackStateAtTime(schedule, this.currentTime);
      if (!state.currentScheduleItem) continue;

      const clipA = state.currentScheduleItem.clip;
      const mediaA = this.getMediaElement(clipA);

      if (state.nextScheduleItem && state.transitionProgress >= 0) {
        const clipB = state.nextScheduleItem.clip;
        const mediaB = this.getMediaElement(clipB);
        const transType = clipA.transitionOut?.type || 'fade';

        this.renderer.renderTransition(
          mediaA,
          clipA,
          mediaB,
          clipB,
          state.transitionProgress,
          transType,
          options
        );
        anyDrawn = true;
      } else {
        this.renderer.drawMedia(mediaA, clipA, options, 1, 0, 0, 1, isFirstTrack);
        anyDrawn = true;
      }

      isFirstTrack = false;
    }

    if (!anyDrawn && this.totalDuration <= 0) {
      this.renderer.clear();
    }
  }

  public destroy() {
    this.pause();
    this.videoCache.forEach((v) => {
      v.pause();
      v.removeAttribute('src');
      v.load();
    });
    this.audioCache.forEach((a) => {
      a.pause();
      a.removeAttribute('src');
      a.load();
    });
    this.videoCache.clear();
    this.imageCache.clear();
    this.audioCache.clear();
    this.trackSchedules.clear();
    this.listeners.clear();
  }
}
