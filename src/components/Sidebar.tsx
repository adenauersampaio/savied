import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  Sliders,
  Volume2,
  Plus,
  UploadCloud,
  Check,
  Music,
  Image as ImageIcon,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Scissors,
} from 'lucide-react';
import type { FilterPreset, MediaItem, TimelineClip, TransitionType } from '../types/editor';
import { formatDuration } from '../utils/time';

interface SidebarProps {
  userMedia: MediaItem[];
  onUpload: (files: FileList | File[]) => void;
  onDeleteMediaItem: (mediaId: string) => void;
  isUploading: boolean;
  uploadStatusText?: string | null;
  onAddMediaToTimeline: (
    media: MediaItem,
    targetTrack?: 'video' | 'audio',
    position?: 'start' | 'end' | 'playhead' | number
  ) => void;
  onAddAllToTimeline?: () => void;
  selectedClip: TimelineClip | null;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onApplyTransitionToAll: (type: TransitionType, duration: number) => void;
  currentTime?: number;
  width: number;
}

type TabType = 'media' | 'transitions' | 'filters' | 'audio';
type MediaCategory = 'all' | 'video' | 'audio' | 'image';

export const Sidebar: React.FC<SidebarProps> = ({
  userMedia,
  onUpload,
  onDeleteMediaItem,
  isUploading,
  uploadStatusText,
  onAddMediaToTimeline,
  onAddAllToTimeline,
  selectedClip,
  onUpdateClip,
  onApplyTransitionToAll,
  currentTime = 0,
  width,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [transitionDuration, setTransitionDuration] = useState<number>(0.8);
  const [mediaCategory, setMediaCategory] = useState<MediaCategory>('all');
  const [isDragging, setIsDragging] = useState(false);

  const transitionList: { id: TransitionType; name: string; desc: string; icon: string }[] = [
    { id: 'fade', name: 'Dissolver (Crossfade)', desc: 'Transição suave cinematográfica', icon: '✨' },
    { id: 'fadeblack', name: 'Fade para Preto', desc: 'Mergulho dramático no escuro', icon: '🌑' },
    { id: 'fadewhite', name: 'Fade para Branco', desc: 'Clarão de luz vívido', icon: '⚪' },
    { id: 'slideleft', name: 'Deslizar p/ Esquerda', desc: 'Empurrão dinâmico lateral', icon: '⬅️' },
    { id: 'slideright', name: 'Deslizar p/ Direita', desc: 'Empurrão para o outro lado', icon: '➡️' },
    { id: 'wipeleft', name: 'Varredura Esquerda', desc: 'Corte deslizante progressivo', icon: '🪟' },
    { id: 'wiperight', name: 'Varredura Direita', desc: 'Corte deslizante invertido', icon: '🚪' },
    { id: 'zoomin', name: 'Zoom In', desc: 'Aproximação acelerada', icon: '🔍' },
    { id: 'none', name: 'Nenhuma Transição', desc: 'Corte direto sem efeito', icon: '✂️' },
  ];

  const filterPresets: { id: FilterPreset; name: string; desc: string }[] = [
    { id: 'normal', name: 'Normal', desc: 'Cores originais' },
    { id: 'cinema', name: 'Cinema', desc: 'Alto contraste estilizado' },
    { id: 'vintage', name: 'Vintage', desc: 'Tom sépia retrô' },
    { id: 'bw', name: 'Preto & Branco', desc: 'Monocromático clássico' },
    { id: 'vibrant', name: 'Vibrante', desc: 'Cores saturadas e vivas' },
    { id: 'warm', name: 'Quente', desc: 'Tons solares aconchegantes' },
    { id: 'cool', name: 'Frio', desc: 'Tons azulados futuristas' },
  ];

  const filteredMedia = userMedia.filter((m) => {
    if (mediaCategory === 'all') return true;
    return m.type === mediaCategory;
  });

  return (
    <aside
      style={{ width: `${width}px` }}
      className="bg-[#121318] border-r border-[#232632] flex flex-row flex-shrink-0 select-none overflow-hidden h-full"
    >
      {/* Icon Navigation Bar (Left strip) */}
      <nav className="w-16 bg-[#16171e] border-r border-[#232632] flex flex-col items-center py-3 space-y-4 flex-shrink-0">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${
            activeTab === 'media'
              ? 'text-[#00d2d3] bg-[#222533]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c1e27]'
          }`}
          title="Mídia & Arquivos"
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mídia</span>
        </button>

        <button
          onClick={() => setActiveTab('transitions')}
          className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${
            activeTab === 'transitions'
              ? 'text-[#00d2d3] bg-[#222533]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c1e27]'
          }`}
          title="Efeitos de Transição"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-medium">Transição</span>
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${
            activeTab === 'filters'
              ? 'text-[#00d2d3] bg-[#222533]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c1e27]'
          }`}
          title="Filtros & Cor"
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px] font-medium">Filtros</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${
            activeTab === 'audio'
              ? 'text-[#00d2d3] bg-[#222533]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c1e27]'
          }`}
          title="Controle de Áudio"
        >
          <Volume2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Áudio</span>
        </button>
      </nav>

      {/* Tab Content Panel */}
      <div className="flex-1 flex flex-col p-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* TAB 1: MEDIA (Project Media Bin) */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Biblioteca do Projeto</h2>
              <p className="text-[11px] text-gray-400">Importe vídeos, imagens e áudios para o projeto</p>
            </div>

            {/* Upload Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  onUpload(e.dataTransfer.files);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group relative ${
                isDragging
                  ? 'border-[#00d2d3] bg-[#00d2d3]/10 scale-[1.01]'
                  : 'border-[#2b3044] hover:border-[#00d2d3] bg-[#181a22] hover:bg-[#1c1f2a]'
              }`}
            >
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                title="Clique ou arraste vários arquivos para importar"
              />
              <UploadCloud
                className={`w-7 h-7 mb-1.5 transition-colors ${
                  isDragging ? 'text-[#00d2d3]' : 'text-gray-400 group-hover:text-[#00d2d3]'
                }`}
              />
              <span className="text-xs font-semibold text-gray-200 group-hover:text-white text-center">
                {isUploading
                  ? uploadStatusText || 'Processando arquivos...'
                  : 'Importar Mídia (Selecione Vários)'}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 text-center">
                Selecione múltiplos arquivos ou arraste para cá
              </span>
              <span className="text-[9px] text-gray-500 mt-1">
                Vídeos (MP4, WebM), Áudios (MP3, WAV), Imagens (JPG, PNG)
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1 bg-[#161822] p-1 rounded-lg border border-[#242838]">
              {(['all', 'video', 'audio', 'image'] as MediaCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMediaCategory(cat)}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded capitalize transition-all ${
                    mediaCategory === cat
                      ? 'bg-[#252b3e] text-[#00d2d3] shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'Todos' : cat === 'video' ? 'Vídeos' : cat === 'audio' ? 'Áudios' : 'Imagens'}
                </button>
              ))}
            </div>

            {/* Quick Action: Add all filtered to timeline */}
            {filteredMedia.length > 1 && onAddAllToTimeline && (
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="text-[10px] text-gray-400">
                  {filteredMedia.length} arquivo(s) disponível(is)
                </span>
                <button
                  type="button"
                  onClick={onAddAllToTimeline}
                  className="text-[10px] font-semibold text-[#00d2d3] hover:text-[#55efc4] hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Adicionar todos à Timeline</span>
                </button>
              </div>
            )}

            {/* Tip about Drag and Drop */}
            <div className="text-[10.5px] text-gray-300 bg-[#151926] p-2 rounded-xl border border-[#23293d] flex items-center space-x-2">
              <span className="text-[#00d2d3] font-bold">💡 Dica:</span>
              <span className="text-gray-400">
                Arraste qualquer arquivo para a Timeline (no início, entre clipes ou no áudio).
              </span>
            </div>

            {/* Uploaded Items List */}
            {filteredMedia.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 bg-[#161821] rounded-xl border border-[#232634]">
                Nenhum arquivo importado nesta categoria. Use o botão acima para adicionar vídeos, áudios ou fotos.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMedia.map((media) => (
                  <div
                    key={media.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          type: 'media_item',
                          media,
                        })
                      );
                      e.dataTransfer.effectAllowed = 'copyMove';
                    }}
                    className="p-2 bg-[#181a23] border border-[#272b3a] rounded-xl hover:border-[#00d2d3]/50 transition-all flex items-center justify-between group cursor-grab active:cursor-grabbing hover:bg-[#1f2230]"
                    title="Arraste para a Timeline ou use os botões de inserção"
                  >
                    <div className="flex items-center space-x-2 truncate flex-1 min-w-0 pr-2">
                      {/* Drag Handle Grip */}
                      <GripVertical className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 flex-shrink-0 cursor-grab" />

                      {/* Thumbnail or Icon */}
                      <div className="w-10 h-10 rounded-lg bg-black/60 flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#2e3448]">
                        {media.type === 'image' && media.url ? (
                          <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                        ) : media.type === 'video' && media.thumbnailUrl ? (
                          <img src={media.thumbnailUrl} alt={media.name} className="w-full h-full object-cover" />
                        ) : media.type === 'audio' ? (
                          <Music className="w-4 h-4 text-emerald-400" />
                        ) : media.type === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Film className="w-4 h-4 text-[#00d2d3]" />
                        )}
                      </div>

                      <div className="truncate flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-200 truncate" title={media.name}>
                          {media.name}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center space-x-1.5 mt-0.5">
                          <span className="uppercase text-[9px] font-bold text-gray-500">
                            {media.type}
                          </span>
                          {media.type !== 'image' && (
                            <span>• {formatDuration(media.duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {/* Primary Insert Button (Smart at playhead or start) */}
                      <button
                        type="button"
                        onClick={() =>
                          onAddMediaToTimeline(
                            media,
                            media.type === 'audio' ? 'audio' : 'video',
                            'playhead'
                          )
                        }
                        className="px-2 py-1 rounded bg-[#252a3a] hover:bg-[#00d2d3] hover:text-gray-950 text-gray-200 text-[11px] font-semibold transition-all flex items-center space-x-1 shadow-sm"
                        title={
                          currentTime <= 0.1
                            ? 'Inserir no Início da Linha do Tempo'
                            : 'Inserir na Posição da Agulha (Playhead)'
                        }
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>{currentTime <= 0.1 ? 'No Início' : 'Na Agulha'}</span>
                      </button>

                      {/* Dropdown for specific positions (Início, Agulha, Fim) */}
                      <div className="relative group/menu">
                        <button
                          type="button"
                          className="p-1 rounded bg-[#202432] hover:bg-[#2e354a] text-gray-400 hover:text-white transition-colors"
                          title="Escolher onde inserir (Início, Agulha ou Fim)"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:flex flex-col bg-[#141620] border border-[#2b3147] rounded-lg shadow-2xl py-1 min-w-[130px] z-50">
                          <button
                            type="button"
                            onClick={() =>
                              onAddMediaToTimeline(
                                media,
                                media.type === 'audio' ? 'audio' : 'video',
                                'start'
                              )
                            }
                            className="px-2.5 py-1.5 text-left text-[11px] text-gray-300 hover:text-white hover:bg-[#222739] flex items-center space-x-1.5"
                          >
                            <ChevronsLeft className="w-3.5 h-3.5 text-[#00d2d3]" />
                            <span>Inserir no Início</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onAddMediaToTimeline(
                                media,
                                media.type === 'audio' ? 'audio' : 'video',
                                'playhead'
                              )
                            }
                            className="px-2.5 py-1.5 text-left text-[11px] text-gray-300 hover:text-white hover:bg-[#222739] flex items-center space-x-1.5"
                          >
                            <Scissors className="w-3.5 h-3.5 text-[#00d2d3]" />
                            <span>Inserir na Agulha</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onAddMediaToTimeline(
                                media,
                                media.type === 'audio' ? 'audio' : 'video',
                                'end'
                              )
                            }
                            className="px-2.5 py-1.5 text-left text-[11px] text-gray-300 hover:text-white hover:bg-[#222739] flex items-center space-x-1.5"
                          >
                            <ChevronsRight className="w-3.5 h-3.5 text-[#00d2d3]" />
                            <span>Inserir no Final</span>
                          </button>
                        </div>
                      </div>

                      {/* Delete from library */}
                      <button
                        type="button"
                        onClick={() => onDeleteMediaItem(media.id)}
                        className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-0.5"
                        title="Remover da Biblioteca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRANSITIONS */}
        {activeTab === 'transitions' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Efeitos de Transição</h2>
              <p className="text-[11px] text-gray-400">
                Selecione um efeito para o clipe ativo ou aplique em toda a timeline.
              </p>
            </div>

            <div className="bg-[#181a23] p-3 rounded-xl border border-[#262b3a] space-y-2">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Duração da Transição:</span>
                <span className="font-mono text-[#00d2d3] font-bold">{transitionDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.1"
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#2a2f40] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              {transitionList.map((trans) => {
                const isSelected = selectedClip?.transitionOut?.type === trans.id;
                return (
                  <div
                    key={trans.id}
                    onClick={() => {
                      if (selectedClip) {
                        onUpdateClip(selectedClip.id, {
                          transitionOut: {
                            type: trans.id,
                            duration: transitionDuration,
                          },
                        });
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1b2533] border-[#00d2d3] text-white shadow-sm shadow-cyan-500/10'
                        : 'bg-[#181a23] border-[#252938] hover:border-[#383e54] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{trans.icon}</span>
                      <div>
                        <div className="text-xs font-semibold">{trans.name}</div>
                        <div className="text-[10px] text-gray-500">{trans.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#00d2d3]" />}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onApplyTransitionToAll(selectedClip?.transitionOut?.type || 'fade', transitionDuration)}
              className="w-full py-2 bg-[#202534] hover:bg-[#282f42] text-xs font-semibold text-gray-200 rounded-lg border border-[#30364c] transition-colors"
            >
              Aplicar em Todos os Cortes
            </button>
          </div>
        )}

        {/* TAB 3: FILTERS & COLOR */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Filtros & Ajustes de Cor</h2>
              <p className="text-[11px] text-gray-400">
                {selectedClip
                  ? `Editando: ${selectedClip.title}`
                  : 'Selecione um clipe na linha do tempo para ajustar.'}
              </p>
            </div>

            {selectedClip ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-gray-300 block mb-2">Estilos Pré-definidos</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {filterPresets.map((preset) => {
                      const isActive = selectedClip.filter?.preset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() =>
                            onUpdateClip(selectedClip.id, {
                              filter: {
                                ...selectedClip.filter,
                                preset: preset.id,
                              },
                            })
                          }
                          className={`p-2 rounded-lg text-left text-xs font-medium border transition-all ${
                            isActive
                              ? 'bg-[#1a2838] border-[#00d2d3] text-[#00d2d3]'
                              : 'bg-[#181a23] border-[#252938] hover:border-[#383e54] text-gray-300'
                          }`}
                        >
                          <div>{preset.name}</div>
                          <div className="text-[9px] text-gray-500">{preset.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#181a23] p-3 rounded-xl border border-[#252938] space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-300">
                      <span>Brilho</span>
                      <span className="font-mono text-[#00d2d3]">
                        {Math.round((selectedClip.filter?.brightness ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={selectedClip.filter?.brightness ?? 1}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, {
                          filter: {
                            ...selectedClip.filter,
                            brightness: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full h-1.5 bg-[#2a2f40] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-300">
                      <span>Contraste</span>
                      <span className="font-mono text-[#00d2d3]">
                        {Math.round((selectedClip.filter?.contrast ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={selectedClip.filter?.contrast ?? 1}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, {
                          filter: {
                            ...selectedClip.filter,
                            contrast: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full h-1.5 bg-[#2a2f40] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-300">
                      <span>Saturação</span>
                      <span className="font-mono text-[#00d2d3]">
                        {Math.round((selectedClip.filter?.saturation ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={selectedClip.filter?.saturation ?? 1}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, {
                          filter: {
                            ...selectedClip.filter,
                            saturation: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full h-1.5 bg-[#2a2f40] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() =>
                      onUpdateClip(selectedClip.id, {
                        filter: {
                          brightness: 1,
                          contrast: 1,
                          saturation: 1,
                          preset: 'normal',
                        },
                      })
                    }
                    className="w-full py-1 text-[11px] text-gray-400 hover:text-white hover:underline pt-1"
                  >
                    Restaurar Cores Originais
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-500 bg-[#161821] rounded-xl border border-[#232634]">
                Clique em qualquer clipe na linha do tempo para aplicar filtros ou ajustar brilho, contraste e saturação.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIO */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Configurações de Áudio</h2>
              <p className="text-[11px] text-gray-400">
                {selectedClip ? `Clipe: ${selectedClip.title}` : 'Selecione um clipe na timeline.'}
              </p>
            </div>

            {selectedClip ? (
              <div className="bg-[#181a23] p-3 rounded-xl border border-[#252938] space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Volume do Clipe:</span>
                    <span className="font-mono text-[#00d2d3]">
                      {Math.round((selectedClip.volume ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedClip.volume ?? 1}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, {
                        volume: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-[#2a2f40] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#2a2f40]">
                  <span className="text-xs text-gray-300">Silenciar Áudio (Mudo)</span>
                  <button
                    onClick={() =>
                      onUpdateClip(selectedClip.id, {
                        isMuted: !selectedClip.isMuted,
                      })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedClip.isMuted
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-[#222738] text-gray-300 border border-[#30364c]'
                    }`}
                  >
                    {selectedClip.isMuted ? 'Silenciado' : 'Ativo'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-500 bg-[#161821] rounded-xl border border-[#232634]">
                Selecione um clipe para ajustar volume ou silenciar.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
