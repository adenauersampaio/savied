import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Scissors,
  ZoomIn,
  ZoomOut,
  Trash2,
} from 'lucide-react';
import type { AspectRatio, TimelineClip } from '../types/editor';
import { formatTimecode } from '../utils/time';
import { PlaybackController } from '../engine/PlaybackController';

interface PlayerProps {
  playbackControllerRef: React.MutableRefObject<PlaybackController | null>;
  aspectRatio: AspectRatio;
  fitMode: 'contain' | 'cover';
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStep: (delta: number) => void;
  onSplit: () => void;
  onDeleteSelected: () => void;
  selectedClip: TimelineClip | null;
  zoom: number;
  setZoom: (zoom: number) => void;
}

export const Player: React.FC<PlayerProps> = ({
  playbackControllerRef,
  aspectRatio,
  fitMode,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onStep,
  onSplit,
  onDeleteSelected,
  selectedClip,
  zoom,
  setZoom,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 640, height: 360 });

  useEffect(() => {
    if (canvasRef.current && !playbackControllerRef.current) {
      playbackControllerRef.current = new PlaybackController(canvasRef.current);
    }
  }, []);

  // Measure container dimensions with ResizeObserver to ensure zero overflow or cut off
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate box dimensions that strictly fit within the available space
  const targetAspect = aspectRatio === '9:16' ? 9 / 16 : 16 / 9;
  const paddingX = 32;
  const paddingY = 24;
  const availW = Math.max(100, containerSize.width - paddingX);
  const availH = Math.max(100, containerSize.height - paddingY);

  let boxW = availW;
  let boxH = availW / targetAspect;

  if (boxH > availH) {
    boxH = availH;
    boxW = availH * targetAspect;
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[#0b0c0f] select-none relative overflow-hidden">
      {/* Canvas Monitor Area (Flexible, bounded) */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-3 relative overflow-hidden bg-[radial-gradient(#191c28_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {/* Exact-Fitting Monitor Box */}
        <div
          style={{
            width: `${Math.round(boxW)}px`,
            height: `${Math.round(boxH)}px`,
          }}
          className="relative flex items-center justify-center shadow-2xl rounded-xl ring-1 ring-[#2b3044] border-2 border-[#1a1d2b] overflow-hidden bg-black transition-all duration-150"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block pointer-events-none"
          />

          {/* Top Overlays */}
          <div className="absolute top-2.5 left-3 flex items-center space-x-1.5 pointer-events-none">
            <span className="text-[10px] font-mono font-bold bg-black/75 backdrop-blur-md text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
              {aspectRatio === '9:16' ? '9:16 Vertical' : '16:9 Horizontal'}
            </span>
            <span className="text-[10px] font-medium bg-black/60 backdrop-blur-md text-gray-300 px-1.5 py-0.5 rounded border border-white/10">
              {fitMode === 'contain' ? 'Ajustar (Sem Cortes)' : 'Preencher (Zoom)'}
            </span>
          </div>

          {/* Empty timeline placeholder */}
          {totalDuration <= 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm text-center p-6 space-y-3 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-[#1b2130] flex items-center justify-center text-[#00d2d3]">
                <Scissors className="w-6 h-6 -rotate-45" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">Linha do tempo vazia</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Adicione vídeos de teste na aba lateral ou faça upload de arquivos para começar a editar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Transport & Tools Bar */}
      <div className="h-12 bg-[#14161f] border-t border-[#232736] px-4 flex items-center justify-between z-10 flex-shrink-0">
        {/* Timecode display */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-[#00d2d3] font-bold text-sm">
            {formatTimecode(currentTime)}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400 font-medium">
            {formatTimecode(totalDuration)}
          </span>
        </div>

        {/* Playback Controls (Center) */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Go to Start */}
          <button
            onClick={() => onSeek(0)}
            title="Ir para o início (Home)"
            className="p-1.5 rounded-lg hover:bg-[#222738] text-gray-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Step Back 0.1s */}
          <button
            onClick={() => onStep(-0.1)}
            title="Voltar 0.1s (Seta Esquerda)"
            className="p-1.5 rounded-lg hover:bg-[#222738] text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            disabled={totalDuration <= 0}
            title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00d2d3] to-[#0984e3] hover:from-[#00b4b5] hover:to-[#076ec0] text-gray-950 flex items-center justify-center shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-gray-950 stroke-[2.5]" />
            ) : (
              <Play className="w-4 h-4 fill-gray-950 stroke-[2.5] ml-0.5" />
            )}
          </button>

          {/* Step Forward 0.1s */}
          <button
            onClick={() => onStep(0.1)}
            title="Avançar 0.1s (Seta Direita)"
            className="p-1.5 rounded-lg hover:bg-[#222738] text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Go to End */}
          <button
            onClick={() => onSeek(totalDuration)}
            title="Ir para o fim (End)"
            className="p-1.5 rounded-lg hover:bg-[#222738] text-gray-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Split / Delete & Zoom Controls */}
        <div className="flex items-center space-x-3">
          {/* Split button */}
          <button
            onClick={onSplit}
            disabled={totalDuration <= 0}
            title="Cortar / Dividir no Cursor (Atalho: S)"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#222738] hover:bg-[#2e344a] text-xs font-semibold text-gray-200 border border-[#333950] transition-colors disabled:opacity-30"
          >
            <Scissors className="w-3.5 h-3.5 text-[#00d2d3] -rotate-45" />
            <span className="hidden md:inline">Dividir (S)</span>
          </button>

          {/* Delete clip button */}
          {selectedClip && (
            <button
              onClick={onDeleteSelected}
              title="Excluir clipe selecionado (Del)"
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-[1px] bg-[#2a2f42]" />

          {/* Timeline Zoom Slider */}
          <div className="flex items-center space-x-1.5 text-gray-400">
            <ZoomOut className="w-3.5 h-3.5" />
            <input
              type="range"
              min="20"
              max="120"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-[#262a3a] rounded appearance-none cursor-pointer"
              title="Zoom da Linha do Tempo"
            />
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
