import React, { useRef } from 'react';
import type { TimelineAudioClip } from '../../types/editor';
import { Volume2, VolumeX, Music, Trash2, GripVertical } from 'lucide-react';
import { formatDuration } from '../../utils/time';

interface AudioClipCardProps {
  clip: TimelineAudioClip;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateTrim: (trimStart: number, trimEnd: number) => void;
  onUpdatePosition: (newStartTime: number) => void;
  onDelete: () => void;
  onSeek: (time: number) => void;
  zoom: number; // pixels per second
}

export const AudioClipCard: React.FC<AudioClipCardProps> = ({
  clip,
  isSelected,
  onSelect,
  onUpdateTrim,
  onUpdatePosition,
  onDelete,
  onSeek,
  zoom,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const duration = Math.max(0.1, clip.trimEnd - clip.trimStart);
  const width = Math.max(30, duration * zoom);
  const left = clip.startTime * zoom;

  // Handle Dragging Left Trim Handle
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialTrimStart = clip.trimStart;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoom;
      let newTrimStart = initialTrimStart + deltaSeconds;

      newTrimStart = Math.max(0, Math.min(newTrimStart, clip.trimEnd - 0.2));
      onUpdateTrim(newTrimStart, clip.trimEnd);
      onSeek(clip.startTime + (newTrimStart - initialTrimStart));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Dragging Right Trim Handle
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialTrimEnd = clip.trimEnd;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoom;
      let newTrimEnd = initialTrimEnd + deltaSeconds;

      newTrimEnd = Math.max(clip.trimStart + 0.2, Math.min(newTrimEnd, clip.sourceDuration));
      onUpdateTrim(clip.trimStart, newTrimEnd);
      onSeek(clip.startTime + (newTrimEnd - clip.trimStart));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Moving Entire Audio Clip along Timeline
  const handleBodyMouseDown = (e: React.MouseEvent) => {
    onSelect();
    const startX = e.clientX;
    const initialStartTime = clip.startTime;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoom;
      const newStartTime = Math.max(0, initialStartTime + deltaSeconds);
      onUpdatePosition(newStartTime);
      onSeek(newStartTime);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={cardRef}
      onMouseDown={handleBodyMouseDown}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      className={`absolute h-14 rounded-lg flex items-center overflow-hidden cursor-move select-none border transition-all z-10 group ${
        isSelected
          ? 'bg-[#18312d] border-[#00d2d3] ring-2 ring-[#00d2d3]/50 shadow-lg shadow-cyan-500/20'
          : 'bg-[#122220] border-[#1d423e] hover:border-[#2b635c]'
      }`}
    >
      {/* Decorative Waveform Graphic */}
      <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-around px-2 overflow-hidden">
        {Array.from({ length: Math.min(60, Math.floor(width / 6)) }).map((_, i) => (
          <div
            key={i}
            style={{
              height: `${25 + ((i * 17) % 65)}%`,
            }}
            className="w-0.5 bg-[#00d2d3] rounded-full"
          />
        ))}
      </div>

      {/* Left Trim Handle */}
      <div
        onMouseDown={handleLeftMouseDown}
        title="Aparar Início do Áudio"
        className={`absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center transition-colors z-20 ${
          isSelected
            ? 'bg-[#00d2d3] text-gray-950'
            : 'bg-[#1d423e] hover:bg-[#00d2d3] text-gray-400'
        }`}
      >
        <div className="w-0.5 h-4 bg-current rounded-full" />
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-1 flex items-center justify-between h-full pointer-events-none z-10 overflow-hidden">
        <div className="flex items-center space-x-1.5 truncate">
          <div
            draggable={true}
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData(
                'application/json',
                JSON.stringify({
                  type: 'timeline_audio_clip',
                  audioClipId: clip.id,
                  fromTrackId: clip.trackId || 'audio-1',
                })
              );
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="cursor-grab active:cursor-grabbing pointer-events-auto p-0.5 rounded hover:bg-emerald-500/20 text-gray-500 hover:text-emerald-300"
            title="Arraste para mover para outra faixa de áudio"
          >
            <GripVertical className="w-3 h-3" />
          </div>
          <Music className="w-3.5 h-3.5 text-[#00d2d3] flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-200 truncate">
            {clip.title}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0 pointer-events-auto">
          <span className="font-mono text-[10px] bg-black/60 px-1 py-0.5 rounded text-emerald-300">
            {formatDuration(duration)}
          </span>
          {clip.isMuted ? (
            <VolumeX className="w-3 h-3 text-red-400" />
          ) : (
            <Volume2 className="w-3 h-3 text-[#00d2d3]" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Excluir Áudio"
            className="p-0.5 rounded hover:bg-red-500/30 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right Trim Handle */}
      <div
        onMouseDown={handleRightMouseDown}
        title="Aparar Fim do Áudio"
        className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center transition-colors z-20 ${
          isSelected
            ? 'bg-[#00d2d3] text-gray-950'
            : 'bg-[#1d423e] hover:bg-[#00d2d3] text-gray-400'
        }`}
      >
        <div className="w-0.5 h-4 bg-current rounded-full" />
      </div>
    </div>
  );
};
