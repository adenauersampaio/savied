import React from 'react';
import type { AspectRatio } from '../types/editor';
import {
  Scissors,
  Download,
  HelpCircle,
  Undo2,
  Redo2,
  Smartphone,
  Monitor,
  Maximize,
  Minimize,
  FilePlus2,
  RotateCcw,
} from 'lucide-react';

interface HeaderProps {
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  fitMode: 'contain' | 'cover';
  setFitMode: (mode: 'contain' | 'cover') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewProject: () => void;
  onResetLayout: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectTitle,
  setProjectTitle,
  aspectRatio,
  setAspectRatio,
  fitMode,
  setFitMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewProject,
  onResetLayout,
  onOpenExport,
  onOpenShortcuts,
}) => {
  return (
    <header className="h-14 bg-[#14151b] border-b border-[#252834] px-4 flex items-center justify-between select-none z-20 flex-shrink-0">
      {/* Left: Brand, Project Name & New Project */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00d2d3] via-[#0984e3] to-[#6c5ce7] flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Scissors className="w-4 h-4 text-white -rotate-45" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            Savied
          </span>
        </div>

        <div className="h-5 w-[1px] bg-[#2d3142]" />

        {/* New Project Button */}
        <button
          onClick={onNewProject}
          title="Iniciar um Novo Projeto (Limpar Timeline)"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#202434] hover:bg-[#2c3248] text-gray-200 text-xs font-semibold border border-[#30374e] hover:border-[#00d2d3] transition-all shadow-sm active:scale-95"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-[#00d2d3]" />
          <span>Novo</span>
        </button>

        {/* Project Name editable */}
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="bg-transparent hover:bg-[#1e212d] focus:bg-[#1e212d] text-sm text-gray-200 font-medium px-2.5 py-1 rounded border border-transparent hover:border-[#313649] focus:border-[#00d2d3] focus:outline-none transition-all w-36 sm:w-44"
          placeholder="Nome do Projeto"
        />

        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-[#222634] disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-[#222634] disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Aspect Ratio & Fit Mode Segmented Controls */}
      <div className="flex items-center space-x-2 bg-[#1a1c24] p-1 rounded-xl border border-[#2b2f3e]">
        {/* Horizontal 16:9 */}
        <button
          onClick={() => setAspectRatio('16:9')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            aspectRatio === '16:9'
              ? 'bg-[#292d3e] text-[#00d2d3] shadow-sm font-semibold border border-[#3b4158]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#202330]'
          }`}
          title="Formato Horizontal (YouTube, Cinema)"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">16:9</span>
          <span>Horizontal</span>
        </button>

        {/* Vertical 9:16 */}
        <button
          onClick={() => setAspectRatio('9:16')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            aspectRatio === '9:16'
              ? 'bg-[#292d3e] text-[#00d2d3] shadow-sm font-semibold border border-[#3b4158]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#202330]'
          }`}
          title="Formato Vertical (TikTok, Reels, Shorts)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">9:16</span>
          <span>Vertical</span>
        </button>

        <div className="h-4 w-[1px] bg-[#33384c] mx-1" />

        {/* Fit Mode: Ajustar (Contain) vs Preencher (Cover) */}
        <div className="flex items-center space-x-1 bg-[#13151c] p-0.5 rounded-lg border border-[#282d3e]">
          <button
            onClick={() => setFitMode('contain')}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              fitMode === 'contain'
                ? 'bg-[#272d40] text-[#00d2d3] font-semibold border border-[#39425e]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Ajustar: exibe o vídeo inteiro sem cortes, mantendo toda a imagem visível"
          >
            <Minimize className="w-3 h-3 text-[#00d2d3]" />
            <span>Ajustar</span>
          </button>

          <button
            onClick={() => setFitMode('cover')}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              fitMode === 'cover'
                ? 'bg-[#272d40] text-[#00d2d3] font-semibold border border-[#39425e]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Preencher: expande o vídeo para preencher toda a tela, cortando sobras"
          >
            <Maximize className="w-3 h-3 text-[#00d2d3]" />
            <span>Preencher</span>
          </button>
        </div>
      </div>

      {/* Right: Layout Reset, Shortcuts & Export */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Reset Layout button */}
        <button
          onClick={onResetLayout}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-[#1f222d] transition-colors"
          title="Restaurar tamanho padrão dos painéis (Largura da barra e altura da timeline)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
          <span className="hidden lg:inline">Layout Padrão</span>
        </button>

        <button
          onClick={onOpenShortcuts}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-[#1f222d] transition-colors"
          title="Atalhos do Teclado"
        >
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="hidden md:inline">Atalhos</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center space-x-2 bg-gradient-to-r from-[#00d2d3] to-[#0984e3] hover:from-[#00b4b5] hover:to-[#076ec0] text-gray-950 font-bold px-3.5 sm:px-4 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-cyan-500/25 active:scale-95"
        >
          <Download className="w-4 h-4 text-gray-950 stroke-[2.5]" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
