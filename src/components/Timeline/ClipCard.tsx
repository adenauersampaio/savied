import React, { useRef, useState } from 'react';
import type { TimelineClip } from '../../types/editor';
import { Volume2, VolumeX, GripVertical } from 'lucide-react';
import { formatDuration } from '../../utils/time';

interface ClipCardProps {
  clip: TimelineClip;
  clipIndex: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateTrim: (trimStart: number, trimEnd: number) => void;
  onSeek: (time: number) => void;
  zoom: number; // pixels per second
  timelineStart: number;
  style?: React.CSSProperties;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  clipIndex,
  isSelected,
  onSelect,
  onUpdateTrim,
  onSeek,
  zoom,
  timelineStart,
  style,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);

  const duration = Math.max(0.1, clip.trimEnd - clip.trimStart);
  const width = Math.max(30, duration * zoom);
  const left = timelineStart * zoom;

  // Handle Dragging Left Trim Handle
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTrimming(true);
    const startX = e.clientX;
    const initialTrimStart = clip.trimStart;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoom;
      let newTrimStart = initialTrimStart + deltaSeconds;

      // Clamping
      newTrimStart = Math.max(0, Math.min(newTrimStart, clip.trimEnd - 0.2));
      onUpdateTrim(newTrimStart, clip.trimEnd);
      onSeek(timelineStart + (newTrimStart - initialTrimStart));
    };

    const onMouseUp = () => {
      setIsTrimming(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Dragging Right Trim Handle
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTrimming(true);
    const startX = e.clientX;
    const initialTrimEnd = clip.trimEnd;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoom;
      let newTrimEnd = initialTrimEnd + deltaSeconds;

      // Clamping
      newTrimEnd = Math.max(clip.trimStart + 0.2, Math.min(newTrimEnd, clip.sourceDuration));
      onUpdateTrim(clip.trimStart, newTrimEnd);
      onSeek(timelineStart + (newTrimEnd - clip.trimStart));
    };

    const onMouseUp = () => {
      setIsTrimming(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      draggable={!isTrimming}
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            type: 'timeline_clip',
            clipId: clip.id,
            fromIndex: clipIndex,
          })
        );
        e.dataTransfer.effectAllowed = 'move';
      }}
      style={{
        position: 'absolute',
        left: `${left}px`,
        width: `${width}px`,
        top: '8px',
        ...style,
      }}
      className={`h-20 rounded-xl flex items-center overflow-hidden cursor-grab active:cursor-grabbing select-none border transition-shadow group ${
        isSelected
          ? 'bg-[#1a2233] border-[#00d2d3] ring-2 ring-[#00d2d3]/50 shadow-lg shadow-cyan-500/20 z-20'
          : 'bg-[#161822] border-[#292e40] hover:border-[#3d4560] z-10'
      }`}
      title="Clique para selecionar. Arraste para reordenar este clipe na Timeline."
    >
      {/* Background Filmstrip Thumbnails */}
      <div className="absolute inset-0 opacity-25 group-hover:opacity-35 transition-opacity pointer-events-none flex overflow-hidden">
        {clip.thumbnailUrl ? (
          <div
            className="w-full h-full bg-repeat-x bg-cover"
            style={{
              backgroundImage: `url(${clip.thumbnailUrl})`,
              backgroundSize: 'auto 100%',
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-900/30 to-purple-900/30" />
        )}
      </div>

      {/* Left Trim Handle */}
      <div
        onMouseDown={handleLeftMouseDown}
        title="Arrastar para cortar início (Trim Start)"
        className={`absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center transition-colors z-20 ${
          isSelected
            ? 'bg-[#00d2d3] text-gray-950 hover:bg-[#38efef]'
            : 'bg-[#292e40] hover:bg-[#00d2d3] hover:text-gray-950 text-gray-400'
        }`}
      >
        <div className="w-0.5 h-6 bg-current rounded-full" />
      </div>

      {/* Clip Content / Labels */}
      <div className="flex-1 px-4 py-2 flex flex-col justify-between h-full pointer-events-none z-10 overflow-hidden">
        <div className="flex items-center justify-between space-x-1.5">
          <div className="flex items-center space-x-1 truncate min-w-0">
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-700/50 flex-shrink-0">
              #{clipIndex + 1}
            </span>
            <GripVertical className="w-3 h-3 text-gray-500 group-hover:text-cyan-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-100 truncate drop-shadow-sm">
              {clip.title}
            </span>
          </div>
          {clip.isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          ) : clip.volume !== 1 ? (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          ) : null}
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span className="font-mono bg-black/60 px-1 py-0.5 rounded text-gray-300">
            {formatDuration(duration)}
          </span>
          {clip.filter?.preset && clip.filter.preset !== 'normal' && (
            <span className="bg-cyan-500/20 text-cyan-300 px-1 rounded uppercase text-[9px] font-bold">
              {clip.filter.preset}
            </span>
          )}
        </div>
      </div>

      {/* Right Trim Handle */}
      <div
        onMouseDown={handleRightMouseDown}
        title="Arrastar para cortar fim (Trim End)"
        className={`absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center transition-colors z-20 ${
          isSelected
            ? 'bg-[#00d2d3] text-gray-950 hover:bg-[#38efef]'
            : 'bg-[#292e40] hover:bg-[#00d2d3] hover:text-gray-950 text-gray-400'
        }`}
      >
        <div className="w-0.5 h-6 bg-current rounded-full" />
      </div>
    </div>
  );
};
