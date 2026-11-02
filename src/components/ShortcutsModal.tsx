import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Espaço', desc: 'Reproduzir ou Pausar a reprodução do vídeo' },
    { key: 'S', desc: 'Dividir / Cortar o clipe na posição da agulha' },
    { key: 'Del / Backspace', desc: 'Excluir o clipe selecionado' },
    { key: '← / →', desc: 'Avançar ou voltar 0.1 segundo no vídeo' },
    { key: 'Home / End', desc: 'Ir diretamente para o início ou final da timeline' },
    { key: 'Ctrl + Z', desc: 'Desfazer a última alteração' },
    { key: 'Ctrl + Y', desc: 'Refazer a alteração desfeita' },
    { key: 'Bordas do Clipe', desc: 'Clique e arraste as alças laterais para aparar (Trim)' },
    { key: 'Ícone ⧓', desc: 'Clique no botão entre dois clipes para configurar a transição' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#151722] border border-[#2b3044] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#242838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-[#00d2d3] flex items-center justify-center">
              <Keyboard className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="font-bold text-base text-gray-100">Atalhos do Teclado</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#202434] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg bg-[#181a24] border border-[#262a3a]"
            >
              <span className="text-xs text-gray-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#252b3d] border border-[#353c52] text-[#00d2d3] font-mono text-xs font-bold shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#242838] bg-[#12141c] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#202434] hover:bg-[#282e42] text-xs font-semibold text-gray-200 rounded-xl border border-[#2e344a] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
