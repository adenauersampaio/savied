import React, { useRef, useState, useEffect } from 'react';
import type {
  ClipTransition,
  TimelineClip,
  TimelineAudioClip,
  TimelineTrack,
  MediaItem,
} from '../../types/editor';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { ClipCard } from './ClipCard';
import { AudioClipCard } from './AudioClipCard';
import { TransitionBadge } from './TransitionBadge';
import { computeTimelineSchedule } from '../../utils/timeline';
import {
  Film,
  Music,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
} from 'lucide-react';
import { formatDuration } from '../../utils/time';

interface TimelineProps {
  tracks: TimelineTrack[];
  onAddTrack: (type: 'video' | 'audio') => void;
  onDeleteTrack: (trackId: string) => void;
  onRenameTrack: (trackId: string, name: string) => void;
  clips: TimelineClip[];
  audioClips: TimelineAudioClip[];
  selectedClipId: string | null;
  selectedAudioClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSelectAudioClip: (audioClipId: string | null) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onUpdateAudioClip: (audioClipId: string, updates: Partial<TimelineAudioClip>) => void;
  onSplit: () => void;
  onDeleteClip: (clipId: string) => void;
  onDeleteAudioClip: (audioClipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onMoveClip: (fromIndex: number, toIndex: number) => void;
  onMoveToStart: (clipId: string) => void;
  onMoveToEnd: (clipId: string) => void;
  onMoveClipToTrack?: (clipId: string, toTrackId: string, targetIndex?: number) => void;
  onMoveAudioClipToTrack?: (audioClipId: string, toTrackId: string, newStartTime?: number) => void;
  onDetachAudio: () => void;
  onDetachAudioDirect?: (clipId: string, targetStartTime?: number, targetTrackId?: string) => void;
  onAddMediaToTimeline: (
    media: MediaItem,
    targetTrack?: 'video' | 'audio',
    position?: 'start' | 'end' | 'playhead' | number,
    targetTrackId?: string
  ) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  zoom: number; // pixels per second
  height: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  track?: TimelineTrack;
}

interface DragOverState {
  trackId: string;
  trackType: 'video' | 'audio';
  insertIndex?: number;
  indicatorX: number;
  time?: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  onAddTrack,
  onDeleteTrack,
  onRenameTrack,
  clips,
  audioClips,
  selectedClipId,
  selectedAudioClipId,
  onSelectClip,
  onSelectAudioClip,
  onUpdateClip,
  onUpdateAudioClip,
  onSplit,
  onDeleteClip,
  onDeleteAudioClip,
  onDuplicateClip,
  onMoveClip,
  onMoveToStart,
  onMoveToEnd,
  onMoveClipToTrack,
  onMoveAudioClipToTrack,
  onDetachAudio,
  onDetachAudioDirect,
  onAddMediaToTimeline,
  currentTime,
  onSeek,
  zoom,
  height,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState('');

  // Drag over drop indicator state
  const [dragOverState, setDragOverState] = useState<DragOverState | null>(null);

  // Separate tracks
  const videoTracks = tracks.filter((t) => t.type === 'video');
  const audioTracks = tracks.filter((t) => t.type === 'audio');

  const firstVideoTrackId = videoTracks[0]?.id || 'video-1';
  const firstAudioTrackId = audioTracks[0]?.id || 'audio-1';

  // Calculate maximum duration across all video tracks and audio tracks
  let maxTimelineDur = 0;
  for (const vTrack of videoTracks) {
    const vClips = clips.filter((c) => (c.trackId || firstVideoTrackId) === vTrack.id);
    const { totalDuration: dur } = computeTimelineSchedule(vClips);
    if (dur > maxTimelineDur) maxTimelineDur = dur;
  }
  for (const a of audioClips) {
    const aEnd = (a.startTime || 0) + (a.trimEnd - a.trimStart);
    if (aEnd > maxTimelineDur) maxTimelineDur = aEnd;
  }

  const trackWidth = Math.max(1200, (maxTimelineDur + 5) * zoom);
  const playheadX = currentTime * zoom;

  const selectedIndex = clips.findIndex((c) => c.id === selectedClipId);
  const selectedClip = selectedIndex >= 0 ? clips[selectedIndex] : null;
  const selectedAudioClip = audioClips.find((a) => a.id === selectedAudioClipId) || null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const handleDeleteSelected = () => {
    if (selectedClipId) {
      onDeleteClip(selectedClipId);
    } else if (selectedAudioClipId) {
      onDeleteAudioClip(selectedAudioClipId);
    }
  };

  // Close context menu on outside click or scroll
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  const handleStartRename = (track: TimelineTrack) => {
    setEditingTrackId(track.id);
    setEditingTrackName(track.name);
    setContextMenu(null);
  };

  const handleFinishRename = (trackId: string) => {
    if (editingTrackName.trim()) {
      onRenameTrack(trackId, editingTrackName.trim());
    }
    setEditingTrackId(null);
  };

  return (
    <div
      style={{ height: `${height}px` }}
      className="bg-[#111217] border-t border-[#232635] flex flex-col select-none flex-shrink-0 relative overflow-hidden"
    >
      {/* Top Action Toolbar */}
      <TimelineToolbar
        onSplit={onSplit}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={() => selectedClipId && onDuplicateClip(selectedClipId)}
        onMoveLeft={() => selectedIndex > 0 && onMoveClip(selectedIndex, selectedIndex - 1)}
        onMoveRight={() =>
          selectedIndex >= 0 && selectedIndex < clips.length - 1 && onMoveClip(selectedIndex, selectedIndex + 1)
        }
        onMoveToStart={() => selectedClipId && onMoveToStart(selectedClipId)}
        onMoveToEnd={() => selectedClipId && onMoveToEnd(selectedClipId)}
        onDetachAudio={onDetachAudio}
        selectedClip={selectedClip}
        selectedAudioClip={selectedAudioClip}
        clipsCount={clips.length}
        totalDuration={maxTimelineDur}
        canMoveLeft={selectedIndex > 0}
        canMoveRight={selectedIndex >= 0 && selectedIndex < clips.length - 1}
      />

      {/* Main Track Workspace (Track Headers on Left + Scrollable Tracks on Right) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Track Headers (Left sidebar of timeline) */}
        <div className="w-36 sm:w-40 bg-[#14161f] border-r border-[#232635] flex flex-col flex-shrink-0 z-20 overflow-y-auto custom-scrollbar">
          {/* Header Title with Right-Click support and + Track menu */}
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }}
            className="h-7 border-b border-[#232634] bg-[#12131a] flex items-center justify-between px-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider group"
            title="Clique com o botão direito para gerenciar faixas"
          >
            <span>Faixas ({tracks.length})</span>

            <div className="relative group/addbtn">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY });
                }}
                title="Adicionar Faixa de Vídeo ou Áudio"
                className="p-0.5 rounded hover:bg-[#202538] text-gray-400 hover:text-[#00d2d3] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Video Track Headers */}
          {videoTracks.map((vTrack, idx) => {
            const vTrackClips = clips.filter((c) => (c.trackId || firstVideoTrackId) === vTrack.id);
            const isEditing = editingTrackId === vTrack.id;

            return (
              <div
                key={vTrack.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, track: vTrack });
                }}
                className="h-24 border-b border-[#232634] flex flex-col justify-between p-2 bg-[#161822] hover:bg-[#1a1d2a] transition-colors group relative"
                title="Clique com o botão direito para opções da faixa"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                    <Film className="w-3.5 h-3.5 text-[#00d2d3] flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingTrackName}
                        onChange={(e) => setEditingTrackName(e.target.value)}
                        onBlur={() => handleFinishRename(vTrack.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(vTrack.id);
                          if (e.key === 'Escape') setEditingTrackId(null);
                        }}
                        className="bg-[#0f1118] border border-[#00d2d3] rounded px-1 text-xs text-white w-full outline-none"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => handleStartRename(vTrack)}
                        className="text-xs font-semibold text-gray-200 truncate cursor-pointer hover:text-white"
                        title="Clique duplo para renomear"
                      >
                        {vTrack.name}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, track: vTrack });
                    }}
                    className="p-1 rounded text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Menu da Faixa"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>Trilha Vídeo {idx + 1}</span>
                  <span className="font-mono text-gray-400">
                    {vTrackClips.length} {vTrackClips.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Audio Track Headers */}
          {audioTracks.map((aTrack, idx) => {
            const aTrackClips = audioClips.filter((a) => (a.trackId || firstAudioTrackId) === aTrack.id);
            const isEditing = editingTrackId === aTrack.id;

            return (
              <div
                key={aTrack.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, track: aTrack });
                }}
                className="h-20 border-b border-[#232634] flex flex-col justify-between p-2 bg-[#131a19] hover:bg-[#162220] transition-colors group relative"
                title="Clique com o botão direito para opções da faixa"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                    <Music className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingTrackName}
                        onChange={(e) => setEditingTrackName(e.target.value)}
                        onBlur={() => handleFinishRename(aTrack.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(aTrack.id);
                          if (e.key === 'Escape') setEditingTrackId(null);
                        }}
                        className="bg-[#0b1413] border border-emerald-400 rounded px-1 text-xs text-white w-full outline-none"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => handleStartRename(aTrack)}
                        className="text-xs font-semibold text-emerald-200 truncate cursor-pointer hover:text-white"
                        title="Clique duplo para renomear"
                      >
                        {aTrack.name}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, track: aTrack });
                    }}
                    className="p-1 rounded text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Menu da Faixa"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>Trilha Áudio {idx + 1}</span>
                  <span className="font-mono text-emerald-400/80">
                    {aTrackClips.length} {aTrackClips.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Tracks Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0e0f14] custom-scrollbar"
        >
          <div style={{ width: `${trackWidth}px` }} className="min-w-full min-h-full relative pb-4">
            {/* Timecode Ruler */}
            <TimelineRuler
              totalDuration={maxTimelineDur}
              currentTime={currentTime}
              zoom={zoom}
              onSeek={onSeek}
              scrollLeft={scrollLeft}
            />

            {/* VIDEO TRACK LANES */}
            {videoTracks.map((vTrack) => {
              const trackClips = clips.filter(
                (c) => (c.trackId || firstVideoTrackId) === vTrack.id
              );
              const { schedule: trackSchedule } = computeTimelineSchedule(trackClips);
              const isDragOverThisTrack = dragOverState?.trackId === vTrack.id;

              return (
                <div
                  key={vTrack.id}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      onSelectClip(null);
                      onSelectAudioClip(null);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left + scrollLeft;
                      onSeek(Math.max(0, Math.min(maxTimelineDur, clickX / zoom)));
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseTimelineX = e.clientX - rect.left + scrollLeft;

                    let insertIndex = 0;
                    let indicatorX = 8;

                    if (trackClips.length === 0) {
                      insertIndex = 0;
                      indicatorX = 8;
                    } else if (
                      mouseTimelineX <
                      (trackSchedule[0].startTime + trackSchedule[0].duration * 0.45) * zoom
                    ) {
                      insertIndex = 0;
                      indicatorX = 8;
                    } else {
                      insertIndex = trackClips.length;
                      indicatorX = trackSchedule[trackSchedule.length - 1].endTime * zoom;

                      for (let i = 0; i < trackSchedule.length - 1; i++) {
                        const cur = trackSchedule[i];
                        const nxt = trackSchedule[i + 1];
                        const mid =
                          ((cur.startTime + cur.duration * 0.5 + (nxt.startTime + nxt.duration * 0.5)) *
                            0.5) *
                          zoom;
                        if (mouseTimelineX <= mid) {
                          insertIndex = i + 1;
                          indicatorX = cur.endTime * zoom;
                          break;
                        }
                      }
                    }

                    setDragOverState({
                      trackId: vTrack.id,
                      trackType: 'video',
                      insertIndex,
                      indicatorX,
                    });
                  }}
                  onDragLeave={(e) => {
                    // Only clear if leaving this track container
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (
                      e.clientX < rect.left ||
                      e.clientX > rect.right ||
                      e.clientY < rect.top ||
                      e.clientY > rect.bottom
                    ) {
                      setDragOverState(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const state = dragOverState;
                    setDragOverState(null);

                    try {
                      const raw = e.dataTransfer.getData('application/json');
                      if (!raw) return;
                      const data = JSON.parse(raw);

                      // 1. Drop Media from Library
                      if (data.type === 'media_item') {
                        const media = data.media as MediaItem;
                        if (media.type === 'audio') {
                          // Redirect audio item to audio track
                          const rect = e.currentTarget.getBoundingClientRect();
                          const mouseTimelineX = Math.max(0, e.clientX - rect.left + scrollLeft);
                          onAddMediaToTimeline(media, 'audio', mouseTimelineX / zoom, firstAudioTrackId);
                        } else {
                          onAddMediaToTimeline(
                            media,
                            'video',
                            state?.insertIndex ?? 0,
                            vTrack.id
                          );
                        }
                      }
                      // 2. Reorder or Move Clip from another video track
                      else if (data.type === 'timeline_clip') {
                        const fromClipId = data.clipId;
                        const fromIndex = data.fromIndex;
                        const targetIdx = state?.insertIndex ?? 0;

                        // Check if moving between tracks
                        const movingClip = clips.find((c) => c.id === fromClipId);
                        const sourceTrackId = movingClip?.trackId || firstVideoTrackId;

                        if (sourceTrackId === vTrack.id) {
                          // Reordering within same track
                          let toIdx = targetIdx;
                          if (toIdx > fromIndex) toIdx -= 1;
                          if (toIdx !== fromIndex && toIdx >= 0) {
                            onMoveClip(fromIndex, toIdx);
                          }
                        } else {
                          // Moving from another track
                          if (onMoveClipToTrack) {
                            onMoveClipToTrack(fromClipId, vTrack.id, targetIdx);
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Drop error:', err);
                    }
                  }}
                  className={`h-24 px-2 py-2 flex items-center relative border-b border-[#1c1f2c] transition-colors overflow-visible ${
                    isDragOverThisTrack
                      ? 'bg-[#182a36]/60 ring-1 ring-inset ring-[#00d2d3]/50'
                      : 'bg-[#12131c]/50'
                  }`}
                >
                  {/* Visual Drop Indicator */}
                  {isDragOverThisTrack && (
                    <div
                      style={{ left: `${dragOverState.indicatorX}px` }}
                      className="absolute top-0 bottom-0 w-1 bg-[#00d2d3] shadow-[0_0_12px_#00d2d3] z-40 pointer-events-none flex flex-col items-center animate-pulse"
                    >
                      <div className="bg-[#00d2d3] text-gray-950 font-bold text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap -mt-6">
                        {dragOverState.insertIndex === 0
                          ? '👈 Inserir no Início (1º clipe)'
                          : dragOverState.insertIndex === trackClips.length
                          ? '👉 Inserir no Final'
                          : `👉 Inserir na posição ${dragOverState.insertIndex! + 1}`}
                      </div>
                    </div>
                  )}

                  {trackClips.length === 0 ? (
                    <div className="w-full h-16 rounded-xl border-2 border-dashed border-[#262a3c] flex items-center justify-center text-xs text-gray-500">
                      Arraste vídeos ou fotos da biblioteca para esta faixa ({vTrack.name})
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {trackSchedule.map((item, idx) => {
                        const clip = item.clip;
                        const isSelected = clip.id === selectedClipId;
                        const isLast = idx === trackSchedule.length - 1;

                        return (
                          <React.Fragment key={clip.id}>
                            <ClipCard
                              clip={clip}
                              clipIndex={idx}
                              isSelected={isSelected}
                              onSelect={() => {
                                onSelectClip(clip.id);
                                onSelectAudioClip(null);
                              }}
                              onUpdateTrim={(trimStart, trimEnd) => {
                                onUpdateClip(clip.id, { trimStart, trimEnd });
                              }}
                              onSeek={onSeek}
                              zoom={zoom}
                              timelineStart={item.startTime}
                            />

                            {!isLast && (
                              <TransitionBadge
                                transition={
                                  clip.transitionOut || {
                                    type: 'fade',
                                    duration: 0.8,
                                  }
                                }
                                onUpdateTransition={(trans: ClipTransition) => {
                                  onUpdateClip(clip.id, { transitionOut: trans });
                                }}
                                maxDuration={Math.min(
                                  item.duration / 2,
                                  trackSchedule[idx + 1].duration / 2
                                )}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* AUDIO TRACK LANES */}
            {audioTracks.map((aTrack) => {
              const trackAudios = audioClips.filter(
                (a) => (a.trackId || firstAudioTrackId) === aTrack.id
              );
              const isDragOverThisTrack = dragOverState?.trackId === aTrack.id;

              return (
                <div
                  key={aTrack.id}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      onSelectClip(null);
                      onSelectAudioClip(null);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left + scrollLeft;
                      onSeek(Math.max(0, Math.min(maxTimelineDur, clickX / zoom)));
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseTimelineX = Math.max(0, e.clientX - rect.left + scrollLeft);
                    const time = mouseTimelineX / zoom;
                    setDragOverState({
                      trackId: aTrack.id,
                      trackType: 'audio',
                      indicatorX: mouseTimelineX,
                      time,
                    });
                  }}
                  onDragLeave={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (
                      e.clientX < rect.left ||
                      e.clientX > rect.right ||
                      e.clientY < rect.top ||
                      e.clientY > rect.bottom
                    ) {
                      setDragOverState(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetTime = dragOverState?.time ?? 0;
                    setDragOverState(null);

                    try {
                      const raw = e.dataTransfer.getData('application/json');
                      if (!raw) return;
                      const data = JSON.parse(raw);

                      // 1. Audio Media from Library
                      if (data.type === 'media_item') {
                        const media = data.media as MediaItem;
                        onAddMediaToTimeline(media, 'audio', targetTime, aTrack.id);
                      }
                      // 2. Drag Video Clip onto Audio Track (Detach Audio onto this track!)
                      else if (data.type === 'timeline_clip') {
                        if (onDetachAudioDirect) {
                          onDetachAudioDirect(data.clipId, targetTime, aTrack.id);
                        }
                      }
                      // 3. Move existing Audio Clip between tracks or along time
                      else if (data.type === 'timeline_audio_clip') {
                        if (onMoveAudioClipToTrack) {
                          onMoveAudioClipToTrack(data.audioClipId, aTrack.id, targetTime);
                        }
                      }
                    } catch (err) {
                      console.error('Audio track drop error:', err);
                    }
                  }}
                  className={`h-20 px-2 py-2 relative border-b border-[#1c1f2c] transition-colors ${
                    isDragOverThisTrack
                      ? 'bg-[#152e28]/60 ring-1 ring-inset ring-emerald-400/50'
                      : 'bg-[#0f1917]/30'
                  }`}
                >
                  {/* Visual Drop Indicator */}
                  {isDragOverThisTrack && (
                    <div
                      style={{ left: `${dragOverState.indicatorX}px` }}
                      className="absolute top-0 bottom-0 w-1 bg-emerald-400 shadow-[0_0_12px_#34d399] z-40 pointer-events-none flex flex-col items-center animate-pulse"
                    >
                      <div className="bg-emerald-400 text-gray-950 font-bold text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap -mt-6">
                        {`Posicionar áudio em ${formatDuration(dragOverState.time || 0)}`}
                      </div>
                    </div>
                  )}

                  {trackAudios.length === 0 ? (
                    <div className="w-full h-14 rounded-lg border border-dashed border-[#1a3832] flex items-center justify-center text-xs text-gray-600">
                      Arraste áudios para cá ou arraste um vídeo para desvincular seu áudio
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      {trackAudios.map((aClip) => (
                        <AudioClipCard
                          key={aClip.id}
                          clip={aClip}
                          isSelected={aClip.id === selectedAudioClipId}
                          onSelect={() => {
                            onSelectAudioClip(aClip.id);
                            onSelectClip(null);
                          }}
                          onUpdateTrim={(trimStart, trimEnd) => {
                            onUpdateAudioClip(aClip.id, { trimStart, trimEnd });
                          }}
                          onUpdatePosition={(newStartTime) => {
                            onUpdateAudioClip(aClip.id, { startTime: newStartTime });
                          }}
                          onDelete={() => onDeleteAudioClip(aClip.id)}
                          onSeek={onSeek}
                          zoom={zoom}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Global Vertical Red Playhead Needle */}
            <div
              style={{ transform: `translateX(${playheadX}px)` }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none z-30"
            />
          </div>
        </div>
      </div>

      {/* RIGHT-CLICK CONTEXT MENU (Menu de Contexto de Faixas) */}
      {contextMenu && (
        <div
          style={{
            top: `${Math.min(window.innerHeight - 200, contextMenu.y)}px`,
            left: `${Math.min(window.innerWidth - 220, contextMenu.x)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 bg-[#161822] border border-[#2b3147] rounded-xl shadow-2xl py-1.5 min-w-[210px] text-xs select-none animate-in fade-in zoom-in-95 duration-100"
        >
          {contextMenu.track ? (
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-[#232738] mb-1">
              Faixa: {contextMenu.track.name}
            </div>
          ) : (
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-[#232738] mb-1">
              Gerenciar Faixas
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onAddTrack('video');
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-gray-200 hover:text-white hover:bg-[#23273b] flex items-center space-x-2"
          >
            <Film className="w-3.5 h-3.5 text-[#00d2d3]" />
            <span>Adicionar Faixa de Vídeo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onAddTrack('audio');
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-gray-200 hover:text-white hover:bg-[#23273b] flex items-center space-x-2"
          >
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adicionar Faixa de Áudio</span>
          </button>

          {contextMenu.track && (
            <>
              <div className="my-1 border-t border-[#232738]" />

              <button
                type="button"
                onClick={() => handleStartRename(contextMenu.track!)}
                className="w-full px-3 py-1.5 text-left text-gray-200 hover:text-white hover:bg-[#23273b] flex items-center space-x-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Renomear Faixa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteTrack(contextMenu.track!.id);
                  setContextMenu(null);
                }}
                disabled={
                  (contextMenu.track.type === 'video' && videoTracks.length <= 1) ||
                  (contextMenu.track.type === 'audio' && audioTracks.length <= 1)
                }
                className="w-full px-3 py-1.5 text-left text-red-300 hover:text-red-200 hover:bg-red-500/20 disabled:opacity-30 disabled:hover:bg-transparent flex items-center space-x-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Excluir Faixa</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
