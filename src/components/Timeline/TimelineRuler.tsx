import React, { useRef } from 'react';

interface TimelineRulerProps {
  totalDuration: number;
  currentTime: number;
  zoom: number; // pixels per second
  onSeek: (time: number) => void;
  scrollLeft: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalDuration,
  currentTime,
  zoom,
  onSeek,
}) => {
  const rulerRef = useRef<HTMLDivElement | null>(null);

  // Extend ruler slightly past totalDuration for padding
  const extendedDuration = Math.max(10, Math.ceil(totalDuration) + 5);
  const totalWidth = extendedDuration * zoom;

  // Handle Scrubbing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const updateTimeFromX = (clientX: number) => {
      const clickX = clientX - rect.left;
      const newTime = Math.max(0, Math.min(totalDuration, clickX / zoom));
      onSeek(newTime);
    };

    updateTimeFromX(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateTimeFromX(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Generate markers every second or half-second depending on zoom
  const step = zoom < 40 ? 2 : zoom < 80 ? 1 : 0.5;
  const markers = [];
  for (let t = 0; t <= extendedDuration; t += step) {
    markers.push(t);
  }

  const playheadX = currentTime * zoom;

  return (
    <div
      ref={rulerRef}
      onMouseDown={handleMouseDown}
      style={{ width: `${totalWidth}px` }}
      className="h-7 bg-[#13141a] border-b border-[#232634] relative cursor-pointer select-none overflow-hidden"
    >
      {/* Markers */}
      {markers.map((t) => {
        const isWhole = Math.round(t) === t;
        const x = t * zoom;
        return (
          <div
            key={t}
            style={{ left: `${x}px` }}
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-between"
          >
            <div
              className={`w-[1px] ${
                isWhole ? 'h-3 bg-[#3d4358]' : 'h-1.5 bg-[#2a2f42]'
              }`}
            />
            {isWhole && (
              <span className="text-[9px] font-mono text-gray-500 pl-1 leading-none pb-0.5">
                {t}s
              </span>
            )}
          </div>
        );
      })}

      {/* Red Playhead Triangle in Ruler */}
      <div
        style={{ transform: `translateX(${playheadX}px)` }}
        className="absolute top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 -ml-[6px] pointer-events-none z-30"
      />
    </div>
  );
};
