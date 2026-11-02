import React, { useState, useRef, useEffect } from 'react';
import type { ClipTransition, TransitionType } from '../../types/editor';
import { Sparkles, X } from 'lucide-react';

interface TransitionBadgeProps {
  transition: ClipTransition;
  onUpdateTransition: (transition: ClipTransition) => void;
  maxDuration: number;
}

export const TransitionBadge: React.FC<TransitionBadgeProps> = ({
  transition,
  onUpdateTransition,
  maxDuration,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const transitionIcons: Record<TransitionType, string> = {
    fade: '✨',
    fadeblack: '🌑',
    fadewhite: '⚪',
    slideleft: '⬅️',
    slideright: '➡️',
    wipeleft: '🪟',
    wiperight: '🚪',
    zoomin: '🔍',
    none: '✕',
  };

  const transitionLabels: Record<TransitionType, string> = {
    fade: 'Dissolver (Crossfade)',
    fadeblack: 'Fade p/ Preto',
    fadewhite: 'Fade p/ Branco',
    slideleft: 'Deslizar Esquerda',
    slideright: 'Deslizar Direita',
    wipeleft: 'Varredura Esquerda',
    wiperight: 'Varredura Direita',
    zoomin: 'Zoom In',
    none: 'Nenhuma Transição',
  };

  const hasTransition = transition && transition.type !== 'none' && transition.duration > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center justify-center z-10 mx-[-12px]">
      {/* Clickable Badge */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={`Transição: ${hasTransition ? transitionLabels[transition.type] : 'Clique para adicionar transição'}`}
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-lg transition-transform hover:scale-110 active:scale-95 border ${
          hasTransition
            ? 'bg-[#1e2738] border-[#00d2d3] text-[#00d2d3] shadow-cyan-500/20'
            : 'bg-[#181a24] border-[#303548] text-gray-400 hover:text-white hover:border-gray-400'
        }`}
      >
        <span>{hasTransition ? transitionIcons[transition.type] : '⧓'}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-9 left-1/2 -translate-x-1/2 w-64 bg-[#181a24] border border-[#2b3044] rounded-xl shadow-2xl p-3 z-50 text-gray-200 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#292f42] pb-2 mb-2">
            <span className="text-xs font-semibold text-gray-200 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00d2d3]" />
              <span>Efeito de Transição</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Duration slider */}
          <div className="mb-3 space-y-1 bg-[#14151e] p-2 rounded-lg border border-[#232738]">
            <div className="flex justify-between text-[11px] text-gray-300">
              <span>Duração:</span>
              <span className="font-mono text-[#00d2d3] font-bold">
                {(transition.duration || 0.8).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max={Math.max(0.4, Math.min(2.0, maxDuration))}
              step="0.1"
              value={transition.duration || 0.8}
              onChange={(e) =>
                onUpdateTransition({
                  ...transition,
                  duration: parseFloat(e.target.value),
                })
              }
              className="w-full h-1 bg-[#282d3e] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Transition Options Grid */}
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
            {(Object.keys(transitionLabels) as TransitionType[]).map((type) => {
              const isSelected = transition.type === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    onUpdateTransition({
                      type,
                      duration: transition.duration || 0.8,
                    });
                  }}
                  className={`p-1.5 rounded-lg text-left text-[11px] flex items-center space-x-1.5 border transition-all ${
                    isSelected
                      ? 'bg-[#1c2738] border-[#00d2d3] text-[#00d2d3] font-semibold'
                      : 'bg-[#151720] border-[#25293a] hover:border-[#383e56] text-gray-300'
                  }`}
                >
                  <span className="text-sm">{transitionIcons[type]}</span>
                  <span className="truncate">{transitionLabels[type]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
