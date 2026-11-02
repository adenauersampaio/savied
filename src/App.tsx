import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  AspectRatio,
  MediaItem,
  TimelineClip,
  TimelineAudioClip,
  TimelineTrack,
  TransitionType,
} from './types/editor';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { Timeline } from './components/Timeline/Timeline';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { PlaybackController } from './engine/PlaybackController';
import { computeTimelineSchedule, getPlaybackStateAtTime } from './utils/timeline';

interface HistorySnapshot {
  clips: TimelineClip[];
  audioClips: TimelineAudioClip[];
}

export function App() {
  // Project settings
  const [projectTitle, setProjectTitle] = useState('Meu Projeto de Vídeo');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  // Resizable Panels Dimensions
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('savied_sidebar_width');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [timelineHeight, setTimelineHeight] = useState(() => {
    const saved = localStorage.getItem('savied_timeline_height');
    return saved ? parseInt(saved, 10) : 280;
  });

  // Timeline Tracks (Multi-track Video & Audio)
  const [tracks, setTracks] = useState<TimelineTrack[]>(() => {
    try {
      const saved = localStorage.getItem('savied_tracks');
      return saved
        ? JSON.parse(saved)
        : [
            { id: 'video-1', name: 'Vídeo 1', type: 'video' },
            { id: 'audio-1', name: 'Áudio 1', type: 'audio' },
          ];
    } catch {
      return [
        { id: 'video-1', name: 'Vídeo 1', type: 'video' },
        { id: 'audio-1', name: 'Áudio 1', type: 'audio' },
      ];
    }
  });

  // Timeline & Multi-Track Clips
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [audioClips, setAudioClips] = useState<TimelineAudioClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedAudioClipId, setSelectedAudioClipId] = useState<string | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(50); // pixels per second

  // Media Library (User's project files)
  const [userMedia, setUserMedia] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('savied_user_media');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Undo / Redo History
  const [history, setHistory] = useState<HistorySnapshot[]>([
    { clips: [], audioClips: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Playback Controller Ref
  const playbackRef = useRef<PlaybackController | null>(null);

  // Persist media library and panel sizes to localStorage
  useEffect(() => {
    localStorage.setItem('savied_user_media', JSON.stringify(userMedia));
  }, [userMedia]);

  useEffect(() => {
    localStorage.setItem('savied_sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('savied_timeline_height', String(timelineHeight));
  }, [timelineHeight]);

  useEffect(() => {
    localStorage.setItem('savied_tracks', JSON.stringify(tracks));
  }, [tracks]);

  // Push state to history for undo/redo
  const pushState = (newClips: TimelineClip[], newAudioClips: TimelineAudioClip[]) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { clips: newClips, audioClips: newAudioClips }];
    });
    setHistoryIndex((prev) => prev + 1);
    setClips(newClips);
    setAudioClips(newAudioClips);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const snapshot = history[targetIndex];
      setClips(snapshot.clips);
      setAudioClips(snapshot.audioClips);
      setHistoryIndex(targetIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const snapshot = history[targetIndex];
      setClips(snapshot.clips);
      setAudioClips(snapshot.audioClips);
      setHistoryIndex(targetIndex);
    }
  };

  // Change fit mode
  const handleSetFitMode = (mode: 'contain' | 'cover') => {
    setFitMode(mode);
    playbackRef.current?.setFitMode(mode);
    const updated = clips.map((c) => ({ ...c, fitMode: mode }));
    pushState(updated, audioClips);
  };

  // Reset Panel Layout
  const handleResetLayout = () => {
    setSidebarWidth(320);
    setTimelineHeight(280);
  };

  // New Project
  const handleNewProject = () => {
    if (clips.length > 0 || audioClips.length > 0) {
      const confirmed = window.confirm(
        'Deseja criar um Novo Projeto? Isso limpará a linha do tempo atual.'
      );
      if (!confirmed) return;
    }

    playbackRef.current?.pause();
    playbackRef.current?.seek(0);
    setClips([]);
    setAudioClips([]);
    setSelectedClipId(null);
    setSelectedAudioClipId(null);
    setCurrentTime(0);
    setHistory([{ clips: [], audioClips: [] }]);
    setHistoryIndex(0);
    setProjectTitle('Novo Projeto');
  };

  // Synchronize playback controller when tracks, clips, aspect ratio, or fit mode change
  useEffect(() => {
    if (playbackRef.current) {
      playbackRef.current.setTimeline(clips, audioClips, tracks);
      playbackRef.current.setAspectRatio(aspectRatio);
      playbackRef.current.setFitMode(fitMode);
    }
  }, [clips, audioClips, tracks, aspectRatio, fitMode]);

  // Subscribe to playback events
  useEffect(() => {
    if (!playbackRef.current) return;
    const unsubscribe = playbackRef.current.subscribe({
      onTimeUpdate: (time) => setCurrentTime(time),
      onPlayStateChange: (playing) => setIsPlaying(playing),
    });
    return () => unsubscribe();
  }, [playbackRef.current]);

  const fallbackVideoTrackId = tracks.find((t) => t.type === 'video')?.id || 'video-1';
  let maxTotalDuration = 0;
  for (const vTrack of tracks.filter((t) => t.type === 'video')) {
    const vClips = clips.filter((c) => (c.trackId || fallbackVideoTrackId) === vTrack.id);
    const { totalDuration: dur } = computeTimelineSchedule(vClips);
    if (dur > maxTotalDuration) maxTotalDuration = dur;
  }
  for (const a of audioClips) {
    const aEnd = (a.startTime || 0) + (a.trimEnd - a.trimStart);
    if (aEnd > maxTotalDuration) maxTotalDuration = aEnd;
  }

  // Playback handlers
  const handleTogglePlay = () => {
    playbackRef.current?.togglePlay();
  };

  const handleSeek = (time: number) => {
    playbackRef.current?.seek(time);
  };

  const handleStep = (delta: number) => {
    playbackRef.current?.stepFrames(delta);
  };

  // Track management (Add, Delete, Rename)
  const handleAddTrack = (type: 'video' | 'audio') => {
    const existing = tracks.filter((t) => t.type === type);
    const nextNum = existing.length + 1;
    const newTrack: TimelineTrack = {
      id: `${type}-${Date.now()}`,
      name: `${type === 'video' ? 'Vídeo' : 'Áudio'} ${nextNum}`,
      type,
    };
    if (type === 'video') {
      const lastVideoIdx = tracks.map((t) => t.type).lastIndexOf('video');
      const updated = [...tracks];
      updated.splice(lastVideoIdx + 1, 0, newTrack);
      setTracks(updated);
    } else {
      setTracks((prev) => [...prev, newTrack]);
    }
  };

  const handleDeleteTrack = (trackId: string) => {
    const target = tracks.find((t) => t.id === trackId);
    if (!target) return;
    const sameType = tracks.filter((t) => t.type === target.type);
    if (sameType.length <= 1) {
      alert(
        `O projeto precisa ter pelo menos uma faixa de ${
          target.type === 'video' ? 'vídeo' : 'áudio'
        }.`
      );
      return;
    }

    const fallbackTrack = sameType.find((t) => t.id !== trackId)!;
    if (target.type === 'video') {
      const remappedClips = clips.map((c) =>
        (c.trackId || sameType[0]?.id) === trackId ? { ...c, trackId: fallbackTrack.id } : c
      );
      pushState(remappedClips, audioClips);
    } else {
      const remappedAudios = audioClips.map((a) =>
        (a.trackId || sameType[0]?.id) === trackId ? { ...a, trackId: fallbackTrack.id } : a
      );
      pushState(clips, remappedAudios);
    }

    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleRenameTrack = (trackId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, name: trimmed } : t))
    );
  };

  // Move a clip to a specific track (drag between tracks)
  const handleMoveClipToTrack = (
    clipId: string,
    toTrackId: string,
    targetIndex?: number
  ) => {
    const moving = clips.find((c) => c.id === clipId);
    if (!moving) return;

    const remaining = clips.filter((c) => c.id !== clipId);
    const updatedMoving: TimelineClip = { ...moving, trackId: toTrackId };

    const fallbackVideoTrackId = tracks.find((t) => t.type === 'video')?.id || 'video-1';
    const targetTrackClips = remaining.filter(
      (c) => (c.trackId || fallbackVideoTrackId) === toTrackId
    );
    const otherTrackClips = remaining.filter(
      (c) => (c.trackId || fallbackVideoTrackId) !== toTrackId
    );

    const newTargetTrackClips = [...targetTrackClips];
    const idx =
      typeof targetIndex === 'number'
        ? Math.max(0, Math.min(targetIndex, newTargetTrackClips.length))
        : newTargetTrackClips.length;

    newTargetTrackClips.splice(idx, 0, updatedMoving);
    pushState([...otherTrackClips, ...newTargetTrackClips], audioClips);
    setSelectedClipId(updatedMoving.id);
  };

  // Move an audio clip to a specific track
  const handleMoveAudioClipToTrack = (
    audioClipId: string,
    toTrackId: string,
    newStartTime?: number
  ) => {
    const newAudios = audioClips.map((a) => {
      if (a.id === audioClipId) {
        return {
          ...a,
          trackId: toTrackId,
          startTime: typeof newStartTime === 'number' ? Math.max(0, newStartTime) : a.startTime,
        };
      }
      return a;
    });
    pushState(clips, newAudios);
    setSelectedAudioClipId(audioClipId);
  };

  // Add media to timeline (either video track or audio track, with precise insertion position and trackId)
  const handleAddMediaToTimeline = (
    media: MediaItem,
    targetTrack?: 'video' | 'audio',
    insertPosition?: 'start' | 'end' | 'playhead' | number,
    targetTrackId?: string
  ) => {
    const isAudio = targetTrack === 'audio' || media.type === 'audio';
    const fallbackAudioTrackId = tracks.find((t) => t.type === 'audio')?.id || 'audio-1';
    const fallbackVideoTrackId = tracks.find((t) => t.type === 'video')?.id || 'video-1';

    if (isAudio) {
      let startTime = 0;
      if (typeof insertPosition === 'number') {
        startTime = insertPosition;
      } else if (insertPosition === 'start') {
        startTime = 0;
      } else if (insertPosition === 'playhead') {
        startTime = currentTime;
      } else {
        // Default: at the end of audio track
        const lastAudioEnd = audioClips.reduce(
          (max, a) => Math.max(max, a.startTime + (a.trimEnd - a.trimStart)),
          0
        );
        startTime = lastAudioEnd;
      }

      const newAudioClip: TimelineAudioClip = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        mediaId: media.id,
        title: media.name,
        sourceUrl: media.url,
        sourceDuration: media.duration,
        startTime: Math.max(0, startTime),
        trimStart: 0,
        trimEnd: media.duration,
        volume: 1,
        isMuted: false,
        trackId: targetTrackId || fallbackAudioTrackId,
      };
      const newAudioClips = [...audioClips, newAudioClip];
      pushState(clips, newAudioClips);
      setSelectedAudioClipId(newAudioClip.id);
      setSelectedClipId(null);
      return;
    }

    const resolvedVideoTrackId = targetTrackId || fallbackVideoTrackId;

    const newClip: TimelineClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mediaId: media.id,
      title: media.name,
      sourceUrl: media.url,
      sourceDuration: media.duration,
      trimStart: 0,
      trimEnd: media.duration,
      volume: 1,
      isMuted: false,
      filter: { brightness: 1, contrast: 1, saturation: 1, preset: 'normal' },
      fitMode: fitMode,
      transitionOut: { type: 'fade', duration: 0.8 },
      thumbnailUrl: media.thumbnailUrl,
      type: media.type === 'image' ? 'image' : 'video',
      trackId: resolvedVideoTrackId,
    };

    const sameTrackClips = clips.filter(
      (c) => (c.trackId || fallbackVideoTrackId) === resolvedVideoTrackId
    );
    const otherTrackClips = clips.filter(
      (c) => (c.trackId || fallbackVideoTrackId) !== resolvedVideoTrackId
    );

    const newTrackClips = [...sameTrackClips];

    if (typeof insertPosition === 'number') {
      const idx = Math.max(0, Math.min(insertPosition, newTrackClips.length));
      newTrackClips.splice(idx, 0, newClip);
    } else if (insertPosition === 'start') {
      newTrackClips.unshift(newClip);
    } else if (insertPosition === 'end') {
      newTrackClips.push(newClip);
    } else if (insertPosition === 'playhead') {
      if (newTrackClips.length === 0 || currentTime <= 0.1) {
        newTrackClips.unshift(newClip);
      } else {
        const { schedule, totalDuration } = computeTimelineSchedule(newTrackClips);
        if (currentTime >= totalDuration - 0.1) {
          newTrackClips.push(newClip);
        } else {
          const item = schedule.find(
            (s) => currentTime >= s.startTime && currentTime <= s.endTime
          );
          if (item) {
            const offset = currentTime - item.startTime;
            if (offset <= 0.3) {
              newTrackClips.splice(item.index, 0, newClip);
            } else if (item.duration - offset <= 0.3) {
              newTrackClips.splice(item.index + 1, 0, newClip);
            } else {
              const targetClip = item.clip;
              const splitSourceTime = targetClip.trimStart + offset;
              const firstHalf: TimelineClip = {
                ...targetClip,
                trimEnd: splitSourceTime,
              };
              const secondHalf: TimelineClip = {
                ...targetClip,
                id: `clip_${Date.now()}_split`,
                trimStart: splitSourceTime,
              };
              newTrackClips.splice(item.index, 1, firstHalf, newClip, secondHalf);
            }
          } else {
            newTrackClips.push(newClip);
          }
        }
      }
    } else {
      // Default: always append to the end of the timeline
      newTrackClips.push(newClip);
    }

    pushState([...otherTrackClips, ...newTrackClips], audioClips);
    setSelectedClipId(newClip.id);
    setSelectedAudioClipId(null);
  };

  // Add multiple media items to timeline at once (sequencing video and audio)
  const handleAddMultipleMediaToTimeline = (mediaItems: MediaItem[]) => {
    if (mediaItems.length === 0) return;

    const videoImageItems = mediaItems.filter((m) => m.type === 'video' || m.type === 'image');
    const audioItems = mediaItems.filter((m) => m.type === 'audio');

    const newVideoClips: TimelineClip[] = videoImageItems.map((media, idx) => ({
      id: `clip_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      mediaId: media.id,
      title: media.name,
      sourceUrl: media.url,
      sourceDuration: media.duration,
      trimStart: 0,
      trimEnd: media.duration,
      volume: 1,
      isMuted: false,
      filter: { brightness: 1, contrast: 1, saturation: 1, preset: 'normal' },
      fitMode: fitMode,
      transitionOut: { type: 'fade', duration: 0.8 },
      thumbnailUrl: media.thumbnailUrl,
      type: media.type === 'image' ? 'image' : 'video',
    }));

    // For audio clips, place sequentially starting after existing audio clips or at currentTime
    const lastAudioEnd = audioClips.reduce(
      (max, a) => Math.max(max, a.startTime + (a.trimEnd - a.trimStart)),
      0
    );
    let runningAudioStart = Math.max(currentTime, lastAudioEnd);

    const newAudioTimelineClips: TimelineAudioClip[] = audioItems.map((media, idx) => {
      const clip: TimelineAudioClip = {
        id: `aud_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        mediaId: media.id,
        title: media.name,
        sourceUrl: media.url,
        sourceDuration: media.duration,
        startTime: runningAudioStart,
        trimStart: 0,
        trimEnd: media.duration,
        volume: 1,
        isMuted: false,
      };
      runningAudioStart += media.duration;
      return clip;
    });

    const combinedClips = [...clips, ...newVideoClips];
    const combinedAudio = [...audioClips, ...newAudioTimelineClips];

    pushState(combinedClips, combinedAudio);
    if (newVideoClips.length > 0) {
      setSelectedClipId(newVideoClips[newVideoClips.length - 1].id);
      setSelectedAudioClipId(null);
    } else if (newAudioTimelineClips.length > 0) {
      setSelectedAudioClipId(newAudioTimelineClips[newAudioTimelineClips.length - 1].id);
      setSelectedClipId(null);
    }
  };

  // Upload user media (supports multiple files selected or dropped)
  // FIX: Files only go into userMedia library, NOT directly into timeline!
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const count = files.length;
    setIsUploading(true);
    setUploadStatusText(
      count === 1 ? 'Processando 1 arquivo...' : `Processando ${count} arquivos...`
    );

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Falha no upload dos arquivos');
      const data = await res.json();
      const newItems: MediaItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [data];

      if (newItems.length > 0) {
        setUserMedia((prev) => [...newItems, ...prev]);
        setUploadStatusText(
          `${newItems.length} arquivo(s) adicionados à Biblioteca do Projeto!`
        );
        setTimeout(() => setUploadStatusText(null), 3500);
      }
    } catch (err: any) {
      alert(`Erro ao carregar arquivos: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMediaItem = (mediaId: string) => {
    setUserMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  // Move selected clip to start of timeline (Index 0)
  const handleMoveToStart = (clipId: string) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    if (idx > 0) {
      handleMoveClip(idx, 0);
    }
  };

  // Move selected clip to end of timeline
  const handleMoveToEnd = (clipId: string) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    if (idx >= 0 && idx < clips.length - 1) {
      handleMoveClip(idx, clips.length - 1);
    }
  };

  // Detach audio directly from any clip (supports dragging video clip to audio track)
  const handleDetachAudioDirect = (
    clipId: string,
    targetStartTime?: number,
    targetTrackId?: string
  ) => {
    const { schedule } = computeTimelineSchedule(clips);
    const item = schedule.find((s) => s.clip.id === clipId);
    if (!item) return;

    const vClip = item.clip;
    if (vClip.type === 'image') return;

    const startTime = typeof targetStartTime === 'number' ? targetStartTime : item.startTime;
    const fallbackAudioTrackId = tracks.find((t) => t.type === 'audio')?.id || 'audio-1';

    const detachedAudio: TimelineAudioClip = {
      id: `aud_detached_${Date.now()}`,
      mediaId: vClip.mediaId,
      title: `${vClip.title} (Áudio)`,
      sourceUrl: vClip.sourceUrl,
      sourceDuration: vClip.sourceDuration,
      startTime: Math.max(0, startTime),
      trimStart: vClip.trimStart,
      trimEnd: vClip.trimEnd,
      volume: vClip.volume,
      isMuted: false,
      isDetached: true,
      parentClipId: vClip.id,
      trackId: targetTrackId || fallbackAudioTrackId,
    };

    const updatedClips = clips.map((c) =>
      c.id === vClip.id ? { ...c, isMuted: true, hasAudioDetached: true } : c
    );
    const updatedAudioClips = [...audioClips, detachedAudio];

    pushState(updatedClips, updatedAudioClips);
    setSelectedAudioClipId(detachedAudio.id);
  };

  // Detach Audio from selected Video Clip
  const handleDetachAudio = () => {
    if (!selectedClipId) return;
    handleDetachAudioDirect(selectedClipId);
  };

  // Split Clip at current playhead (Scissors / 'S')
  const handleSplit = useCallback(() => {
    // If an audio clip is selected, split the audio clip
    if (selectedAudioClipId) {
      const aClip = audioClips.find((a) => a.id === selectedAudioClipId);
      if (aClip) {
        const offset = currentTime - aClip.startTime;
        const dur = aClip.trimEnd - aClip.trimStart;
        if (offset > 0.15 && offset < dur - 0.15) {
          const splitPt = aClip.trimStart + offset;
          const firstPart: TimelineAudioClip = {
            ...aClip,
            trimEnd: splitPt,
          };
          const secondPart: TimelineAudioClip = {
            ...aClip,
            id: `aud_${Date.now()}_split`,
            startTime: aClip.startTime + offset,
            trimStart: splitPt,
          };
          const newAudios = audioClips.flatMap((a) =>
            a.id === selectedAudioClipId ? [firstPart, secondPart] : [a]
          );
          pushState(clips, newAudios);
          setSelectedAudioClipId(secondPart.id);
          return;
        }
      }
    }

    // Otherwise split the active video clip
    if (clips.length === 0) return;
    const { schedule } = computeTimelineSchedule(clips);
    const playbackState = getPlaybackStateAtTime(schedule, currentTime);
    if (!playbackState.currentScheduleItem) return;

    const activeItem = playbackState.currentScheduleItem;
    const clipIndex = activeItem.index;
    const targetClip = activeItem.clip;
    const offsetInClip = currentTime - activeItem.startTime;

    if (offsetInClip < 0.15 || offsetInClip > activeItem.duration - 0.15) return;

    const splitSourceTime = targetClip.trimStart + offsetInClip;

    const firstHalf: TimelineClip = {
      ...targetClip,
      trimEnd: splitSourceTime,
      transitionOut: { type: 'fade', duration: 0.8 },
    };

    const secondHalf: TimelineClip = {
      ...targetClip,
      id: `clip_${Date.now()}_split`,
      trimStart: splitSourceTime,
    };

    const newClips = [...clips];
    newClips.splice(clipIndex, 1, firstHalf, secondHalf);
    pushState(newClips, audioClips);
    setSelectedClipId(secondHalf.id);
  }, [clips, audioClips, currentTime, selectedAudioClipId]);

  // Update video clip
  const handleUpdateClip = (clipId: string, updates: Partial<TimelineClip>) => {
    const newClips = clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c));
    pushState(newClips, audioClips);
  };

  // Delete video clip
  const handleDeleteClip = (clipId: string) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    const newClips = clips.filter((c) => c.id !== clipId);
    pushState(newClips, audioClips);

    if (newClips.length > 0) {
      const nextIdx = Math.min(idx, newClips.length - 1);
      setSelectedClipId(newClips[nextIdx].id);
    } else {
      setSelectedClipId(null);
    }
  };

  // Update audio clip
  const handleUpdateAudioClip = (audioClipId: string, updates: Partial<TimelineAudioClip>) => {
    const newAudios = audioClips.map((a) =>
      a.id === audioClipId ? { ...a, ...updates } : a
    );
    pushState(clips, newAudios);
  };

  // Delete audio clip
  const handleDeleteAudioClip = (audioClipId: string) => {
    const newAudios = audioClips.filter((a) => a.id !== audioClipId);
    pushState(clips, newAudios);
    if (selectedAudioClipId === audioClipId) {
      setSelectedAudioClipId(null);
    }
  };

  // Duplicate video clip
  const handleDuplicateClip = (clipId: string) => {
    const idx = clips.findIndex((c) => c.id === clipId);
    if (idx < 0) return;
    const original = clips[idx];
    const duplicate: TimelineClip = {
      ...original,
      id: `clip_${Date.now()}_dup`,
      title: `${original.title} (Cópia)`,
    };
    const newClips = [...clips];
    newClips.splice(idx + 1, 0, duplicate);
    pushState(newClips, audioClips);
    setSelectedClipId(duplicate.id);
  };

  // Reorder video clip
  const handleMoveClip = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= clips.length || toIndex >= clips.length) return;
    const newClips = [...clips];
    const [moved] = newClips.splice(fromIndex, 1);
    newClips.splice(toIndex, 0, moved);
    pushState(newClips, audioClips);
  };

  // Apply transition to all video clips
  const handleApplyTransitionToAll = (type: TransitionType, duration: number) => {
    const newClips = clips.map((c) => ({
      ...c,
      transitionOut: { type, duration },
    }));
    pushState(newClips, audioClips);
  };

  // Handle Dragging Horizontal Sidebar Resizer
  const handleSidebarResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(220, Math.min(560, initialWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Dragging Vertical Timeline Resizer
  const handleTimelineResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const initialHeight = timelineHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(180, Math.min(520, initialHeight - deltaY));
      setTimelineHeight(newHeight);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleSplit();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        } else if (selectedAudioClipId) {
          e.preventDefault();
          handleDeleteAudioClip(selectedAudioClipId);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStep(-0.1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStep(0.1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleSeek(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        handleSeek(maxTotalDuration);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleTogglePlay,
    handleSplit,
    selectedClipId,
    selectedAudioClipId,
    handleStep,
    handleSeek,
    maxTotalDuration,
    historyIndex,
    history,
  ]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e0f14] text-gray-200 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <Header
        projectTitle={projectTitle}
        setProjectTitle={setProjectTitle}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        fitMode={fitMode}
        setFitMode={handleSetFitMode}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNewProject={handleNewProject}
        onResetLayout={handleResetLayout}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Editing Area (Sidebar + Canvas Monitor) */}
      <div className="flex-1 flex flex-row overflow-hidden relative min-h-0 min-w-0">
        {/* Left Sidebar (Resizable) */}
        <Sidebar
          userMedia={userMedia}
          onUpload={handleUploadFiles}
          onDeleteMediaItem={handleDeleteMediaItem}
          isUploading={isUploading}
          uploadStatusText={uploadStatusText}
          onAddMediaToTimeline={handleAddMediaToTimeline}
          onAddAllToTimeline={() => handleAddMultipleMediaToTimeline(userMedia)}
          selectedClip={selectedClip}
          onUpdateClip={handleUpdateClip}
          onApplyTransitionToAll={handleApplyTransitionToAll}
          width={sidebarWidth}
        />

        {/* Horizontal Splitter (Sidebar Resizer) */}
        <div
          onMouseDown={handleSidebarResizerMouseDown}
          title="Arraste para redimensionar a barra lateral"
          className="w-1.5 hover:w-2 bg-[#1c1f2c] hover:bg-[#00d2d3] active:bg-[#00d2d3] cursor-col-resize transition-all z-20 flex items-center justify-center group"
        >
          <div className="w-0.5 h-8 bg-gray-600 group-hover:bg-gray-950 rounded-full" />
        </div>

        {/* Center Preview Monitor */}
        <Player
          playbackControllerRef={playbackRef}
          aspectRatio={aspectRatio}
          fitMode={fitMode}
          currentTime={currentTime}
          totalDuration={maxTotalDuration}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onStep={handleStep}
          onSplit={handleSplit}
          onDeleteSelected={() => {
            if (selectedClipId) handleDeleteClip(selectedClipId);
            if (selectedAudioClipId) handleDeleteAudioClip(selectedAudioClipId);
          }}
          selectedClip={selectedClip}
          zoom={zoom}
          setZoom={setZoom}
        />
      </div>

      {/* Vertical Splitter (Timeline Resizer) */}
      <div
        onMouseDown={handleTimelineResizerMouseDown}
        title="Arraste para redimensionar a altura da linha do tempo"
        className="h-1.5 hover:h-2 bg-[#1c1f2c] hover:bg-[#00d2d3] active:bg-[#00d2d3] cursor-row-resize transition-all z-20 flex items-center justify-center group"
      >
        <div className="h-0.5 w-12 bg-gray-600 group-hover:bg-gray-950 rounded-full" />
      </div>

      {/* Bottom Multi-Track Timeline (Resizable Height) */}
      <Timeline
        tracks={tracks}
        onAddTrack={handleAddTrack}
        onDeleteTrack={handleDeleteTrack}
        onRenameTrack={handleRenameTrack}
        clips={clips}
        audioClips={audioClips}
        selectedClipId={selectedClipId}
        selectedAudioClipId={selectedAudioClipId}
        onSelectClip={(id) => {
          setSelectedClipId(id);
          if (id) setSelectedAudioClipId(null);
        }}
        onSelectAudioClip={(id) => {
          setSelectedAudioClipId(id);
          if (id) setSelectedClipId(null);
        }}
        onUpdateClip={handleUpdateClip}
        onUpdateAudioClip={handleUpdateAudioClip}
        onSplit={handleSplit}
        onDeleteClip={handleDeleteClip}
        onDeleteAudioClip={handleDeleteAudioClip}
        onDuplicateClip={handleDuplicateClip}
        onMoveClip={handleMoveClip}
        onMoveToStart={handleMoveToStart}
        onMoveToEnd={handleMoveToEnd}
        onMoveClipToTrack={handleMoveClipToTrack}
        onMoveAudioClipToTrack={handleMoveAudioClipToTrack}
        onDetachAudio={handleDetachAudio}
        onDetachAudioDirect={handleDetachAudioDirect}
        onAddMediaToTimeline={handleAddMediaToTimeline}
        currentTime={currentTime}
        onSeek={handleSeek}
        zoom={zoom}
        height={timelineHeight}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        clips={clips}
        audioClips={audioClips}
        initialAspectRatio={aspectRatio}
        fitMode={fitMode}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default App;
