import React from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Layers,
  Music,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { TimelineClip, TimelineAudioClip } from '../../types/editor';
import { formatTimecode } from '../../utils/time';

interface TimelineToolbarProps {
  onSplit: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onMoveToStart?: () => void;
  onMoveToEnd?: () => void;
  onDetachAudio: () => void;
  selectedClip: TimelineClip | null;
  selectedAudioClip: TimelineAudioClip | null;
  clipsCount: number;
  totalDuration: number;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  onSplit,
  onDeleteSelected,
  onDuplicateSelected,
  onMoveLeft,
  onMoveRight,
  onMoveToStart,
  onMoveToEnd,
  onDetachAudio,
  selectedClip,
  selectedAudioClip,
  clipsCount,
  totalDuration,
  canMoveLeft,
  canMoveRight,
}) => {
  const hasSelection = !!selectedClip || !!selectedAudioClip;

  return (
    <div className="h-10 bg-[#151720] border-b border-[#232736] px-4 flex items-center justify-between select-none flex-shrink-0">
      {/* Left: Action Buttons */}
      <div className="flex items-center space-x-1.5">
        {/* Split */}
        <button
          onClick={onSplit}
          disabled={clipsCount === 0 && !selectedAudioClip}
          title="Dividir clipe no cursor (Atalho: S)"
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#202434] hover:bg-[#2b3147] text-gray-200 text-xs font-semibold border border-[#30364c] transition-colors disabled:opacity-30"
        >
          <Scissors className="w-3.5 h-3.5 text-[#00d2d3] -rotate-45" />
          <span>Dividir (S)</span>
        </button>

        {/* Detach Audio (Separar Áudio) */}
        <button
          onClick={onDetachAudio}
          disabled={!selectedClip || selectedClip.type === 'image'}
          title="Separar áudio do vídeo para a trilha de áudio independente"
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#202434] hover:bg-cyan-500/20 text-gray-200 hover:text-cyan-300 text-xs font-semibold border border-[#30364c] hover:border-cyan-500/40 transition-colors disabled:opacity-30"
        >
          <Music className="w-3.5 h-3.5 text-[#00d2d3]" />
          <span className="hidden sm:inline">Separar Áudio</span>
        </button>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Excluir selecionado (Atalho: Delete)"
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#202434] hover:bg-red-500/20 text-gray-300 hover:text-red-400 text-xs font-semibold border border-[#30364c] hover:border-red-500/40 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Excluir</span>
        </button>

        {/* Duplicate */}
        <button
          onClick={onDuplicateSelected}
          disabled={!selectedClip}
          title="Duplicar clipe selecionado"
          className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-[#202434] text-gray-400 hover:text-gray-200 text-xs font-medium transition-colors disabled:opacity-30"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Duplicar</span>
        </button>

        <div className="h-4 w-[1px] bg-[#292e40] mx-1" />

        {/* Reordering Controls: Move to Start / Left / Right / to End */}
        <button
          onClick={onMoveToStart}
          disabled={!canMoveLeft}
          title="Mover clipe para o Início da Timeline (1º lugar)"
          className="p-1 rounded hover:bg-[#202434] text-gray-400 hover:text-[#00d2d3] transition-colors disabled:opacity-20 flex items-center"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveLeft}
          disabled={!canMoveLeft}
          title="Mover clipe para esquerda"
          className="p-1 rounded hover:bg-[#202434] text-gray-400 hover:text-white transition-colors disabled:opacity-20"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveRight}
          disabled={!canMoveRight}
          title="Mover clipe para direita"
          className="p-1 rounded hover:bg-[#202434] text-gray-400 hover:text-white transition-colors disabled:opacity-20"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveToEnd}
          disabled={!canMoveRight}
          title="Mover clipe para o Fim da Timeline (último lugar)"
          className="p-1 rounded hover:bg-[#202434] text-gray-400 hover:text-[#00d2d3] transition-colors disabled:opacity-20 flex items-center"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Info */}
      <div className="flex items-center space-x-3 text-xs text-gray-400">
        <div className="flex items-center space-x-1.5 font-mono">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-200 font-medium">{clipsCount}</span>
          <span>{clipsCount === 1 ? 'vídeo' : 'vídeos'}</span>
          <span>•</span>
          <span className="text-gray-200 font-bold">{formatTimecode(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};
