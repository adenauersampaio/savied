import type { AspectRatio, TimelineClip, TimelineAudioClip } from '../types/editor';
import { type ClipSchedule, computeTimelineSchedule, getPlaybackStateAtTime, type ActivePlaybackState } from '../utils/timeline';
import { VideoRenderer, type DrawableMedia } from './VideoRenderer';

export interface PlaybackListener {
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

export class PlaybackController {
  private renderer: VideoRenderer;
  private videoCache: Map<string, HTMLVideoElement> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  private schedule: ClipSchedule[] = [];
  private audioClips: TimelineAudioClip[] = [];
  private totalDuration: number = 0;

  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
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

  public setTimeline(clips: TimelineClip[], audioClips: TimelineAudioClip[] = []) {
    const computed = computeTimelineSchedule(clips);
    this.schedule = computed.schedule;
    this.audioClips = audioClips;

    // Calculate maximum duration including audio clips
    let maxDur = computed.totalDuration;
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
      this.getAudioElement(a.sourceUrl);
    });

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

    let video = this.videoCache.get(url);
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

      this.videoCache.set(url, video);
    }
    return video;
  }

  public getAudioElement(url: string): HTMLAudioElement {
    let audio = this.audioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = 'auto';
      this.audioCache.set(url, audio);
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
    this.notifyPlayState(true);

    const state = getPlaybackStateAtTime(this.schedule, this.currentTime);
    if (state.currentScheduleItem) {
      const media = this.getMediaElement(state.currentScheduleItem.clip);
      if (media instanceof HTMLVideoElement) {
        media.currentTime = state.currentClipTime;
        media.play().catch(() => {});
      }
    }

    this.syncAudioTrack(true);
    this.loop();
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
    this.notifyTime(this.currentTime, true);

    const state = getPlaybackStateAtTime(this.schedule, this.currentTime);
    const activeVideos = new Set<HTMLVideoElement>();

    if (state.currentScheduleItem) {
      const mediaA = this.getMediaElement(state.currentScheduleItem.clip);
      if (mediaA instanceof HTMLVideoElement) {
        activeVideos.add(mediaA);
        mediaA.currentTime = state.currentClipTime;
        const baseVolA = state.currentScheduleItem.clip.isMuted ? 0 : state.currentScheduleItem.clip.volume;
        mediaA.volume = Math.max(0, Math.min(1, baseVolA));

        if (this.isPlaying && mediaA.paused) {
          mediaA.play().catch(() => {});
        }
      }
    }

    if (state.nextScheduleItem && state.transitionProgress >= 0) {
      const mediaB = this.getMediaElement(state.nextScheduleItem.clip);
      if (mediaB instanceof HTMLVideoElement) {
        activeVideos.add(mediaB);
        mediaB.currentTime = state.nextClipTime;
        const baseVolB = state.nextScheduleItem.clip.isMuted ? 0 : state.nextScheduleItem.clip.volume;
        mediaB.volume = Math.max(0, Math.min(1, baseVolB * state.transitionProgress));

        if (this.isPlaying && mediaB.paused) {
          mediaB.play().catch(() => {});
        }
      }
    }

    this.videoCache.forEach((v) => {
      if (!activeVideos.has(v) && !v.paused) {
        v.pause();
      }
    });

    this.syncAudioTrack(this.isPlaying);
    this.renderCurrentFrame(state);
  }

  public stepFrames(seconds: number) {
    this.pause();
    this.seek(this.currentTime + seconds);
  }

  private syncAudioTrack(shouldPlay: boolean) {
    const activeAudios = new Set<HTMLAudioElement>();

    for (const aClip of this.audioClips) {
      const aStart = aClip.startTime || 0;
      const aDur = Math.max(0.1, aClip.trimEnd - aClip.trimStart);
      const aEnd = aStart + aDur;

      if (this.currentTime >= aStart && this.currentTime <= aEnd) {
        const audio = this.getAudioElement(aClip.sourceUrl);
        activeAudios.add(audio);

        const targetOffset = aClip.trimStart + (this.currentTime - aStart);
        if (Math.abs(audio.currentTime - targetOffset) > 0.15) {
          audio.currentTime = targetOffset;
        }

        audio.volume = aClip.isMuted ? 0 : Math.max(0, Math.min(1, aClip.volume ?? 1));

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

    if (this.currentTime >= this.totalDuration) {
      this.currentTime = this.totalDuration;
      this.pause();
      return;
    }

    const state = getPlaybackStateAtTime(this.schedule, this.currentTime);

    if (state.currentScheduleItem) {
      const itemA = state.currentScheduleItem;
      const clipA = itemA.clip;
      const mediaA = this.getMediaElement(clipA);

      if (mediaA instanceof HTMLVideoElement) {
        if (mediaA.paused && mediaA.readyState >= 2) {
          mediaA.currentTime = state.currentClipTime;
          mediaA.play().catch(() => {});
        }

        if (!mediaA.paused && mediaA.readyState >= 2) {
          const videoTime = mediaA.currentTime;
          const currentTimelineTime = itemA.startTime + (videoTime - clipA.trimStart);
          this.currentTime = Math.max(itemA.startTime, Math.min(itemA.endTime, currentTimelineTime));
        }

        if (mediaA.currentTime >= clipA.trimEnd - 0.03) {
          const nextIdx = itemA.index + 1;
          if (nextIdx < this.schedule.length) {
            const nextItem = this.schedule[nextIdx];
            const nextMedia = this.getMediaElement(nextItem.clip);
            if (nextMedia instanceof HTMLVideoElement) {
              nextMedia.currentTime = nextItem.clip.trimStart;
              nextMedia.play().catch(() => {});
            }
            mediaA.pause();
            this.currentTime = nextItem.startTime;
          } else {
            this.currentTime = this.totalDuration;
            this.pause();
            return;
          }
        }

        const baseVolA = clipA.isMuted ? 0 : clipA.volume;
        if (state.transitionProgress >= 0) {
          mediaA.volume = Math.max(0, Math.min(1, baseVolA * (1 - state.transitionProgress)));
        } else {
          mediaA.volume = Math.max(0, Math.min(1, baseVolA));
        }
      } else {
        // Image clip advances via frame time
        this.currentTime += 1 / 60;
        if (this.currentTime >= itemA.endTime) {
          const nextIdx = itemA.index + 1;
          if (nextIdx < this.schedule.length) {
            this.currentTime = this.schedule[nextIdx].startTime;
          } else {
            this.currentTime = this.totalDuration;
            this.pause();
            return;
          }
        }
      }

      if (state.nextScheduleItem && state.transitionProgress >= 0) {
        const itemB = state.nextScheduleItem;
        const clipB = itemB.clip;
        const mediaB = this.getMediaElement(clipB);

        if (mediaB instanceof HTMLVideoElement) {
          if (mediaB.paused && mediaB.readyState >= 2) {
            mediaB.currentTime = state.nextClipTime;
            mediaB.play().catch(() => {});
          }
          const baseVolB = clipB.isMuted ? 0 : clipB.volume;
          mediaB.volume = Math.max(0, Math.min(1, baseVolB * state.transitionProgress));
        }
      }
    } else {
      // Audio-only tail of timeline
      this.currentTime += 1 / 60;
    }

    this.syncAudioTrack(true);
    this.notifyTime(this.currentTime);
    this.renderCurrentFrame(state);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public renderCurrentFrame(givenState?: ActivePlaybackState) {
    if (this.schedule.length === 0) {
      this.renderer.clear();
      return;
    }

    const state = givenState || getPlaybackStateAtTime(this.schedule, this.currentTime);
    if (!state.currentScheduleItem) {
      this.renderer.clear();
      return;
    }

    const clipA = state.currentScheduleItem.clip;
    const mediaA = this.getMediaElement(clipA);

    const options = {
      aspectRatio: this.aspectRatio,
      fitMode: this.fitMode,
    };

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
    } else {
      this.renderer.drawMedia(mediaA, clipA, options, 1);
    }
  }

  public destroy() {
    this.pause();
    this.videoCache.forEach((v) => {
      v.pause();
      v.src = '';
    });
    this.audioCache.forEach((a) => {
      a.pause();
      a.src = '';
    });
    this.videoCache.clear();
    this.imageCache.clear();
    this.audioCache.clear();
    this.listeners.clear();
  }
}
