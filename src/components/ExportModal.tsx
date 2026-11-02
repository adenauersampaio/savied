import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { AspectRatio, TimelineClip, TimelineAudioClip } from '../types/editor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: TimelineClip[];
  audioClips: TimelineAudioClip[];
  initialAspectRatio: AspectRatio;
  fitMode: 'contain' | 'cover';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  clips,
  audioClips,
  initialAspectRatio,
  fitMode,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAspectRatio(initialAspectRatio);
  }, [initialAspectRatio]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (clips.length === 0) {
      setError('Adicione pelo menos um clipe à linha do tempo antes de exportar.');
      return;
    }

    setIsExporting(true);
    setProgress(5);
    setStatusMessage('Inicializando exportador...');
    setError(null);
    setDownloadUrl(null);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aspectRatio,
          resolution,
          fps,
          fitMode,
          clips,
          audioClips,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao iniciar renderização.');
      }

      const { jobId } = await res.json();
      setStatusMessage('Renderizando cortes, transições e áudio com FFmpeg...');

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/export/status/${jobId}`);
          if (!pollRes.ok) return;

          const jobData = await pollRes.json();

          if (jobData.status === 'processing') {
            setProgress(Math.max(10, jobData.progress || 10));
            setStatusMessage(`Processando vídeo... ${jobData.progress || 10}%`);
          } else if (jobData.status === 'done') {
            clearInterval(pollInterval);
            setProgress(100);
            setIsExporting(false);
            setDownloadUrl(jobData.downloadUrl);
            setStatusMessage('Vídeo exportado com sucesso!');
          } else if (jobData.status === 'error') {
            clearInterval(pollInterval);
            setIsExporting(false);
            setError(jobData.error || 'Erro durante a renderização no servidor.');
          }
        } catch (err: any) {
          console.error('Polling error:', err);
        }
      }, 800);
    } catch (err: any) {
      console.error('Export error:', err);
      setIsExporting(false);
      setError(err.message || 'Erro ao conectar com o serviço de exportação.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#151722] border border-[#2b3044] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#242838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-[#00d2d3] flex items-center justify-center">
              <Download className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="font-bold text-base text-gray-100">Exportar Vídeo</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#202434] transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {downloadUrl ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-100">Vídeo Pronto para Download!</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Renderizado em {aspectRatio === '9:16' ? 'Vertical 9:16' : 'Horizontal 16:9'} ({resolution}) a {fps} FPS.
                </p>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-black max-h-56 mx-auto border border-[#2a2f42] flex items-center justify-center">
                <video
                  src={downloadUrl}
                  controls
                  autoPlay
                  className="max-h-56 object-contain"
                />
              </div>

              <a
                href={downloadUrl}
                download={`video_savied_${aspectRatio.replace(':', '_')}_${resolution}.mp4`}
                className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-[#00d2d3] to-[#0984e3] hover:from-[#00b4b5] hover:to-[#076ec0] text-gray-950 font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/25 transition-all text-sm active:scale-95"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Baixar Vídeo MP4</span>
              </a>

              <button
                onClick={() => setDownloadUrl(null)}
                className="text-xs text-gray-400 hover:text-white hover:underline block mx-auto pt-1"
              >
                Exportar com outras configurações
              </button>
            </div>
          ) : isExporting ? (
            <div className="py-6 space-y-4 text-center">
              <Loader2 className="w-10 h-10 text-[#00d2d3] animate-spin mx-auto" />
              <div>
                <h3 className="text-sm font-semibold text-gray-100">{statusMessage}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Formatando para {aspectRatio === '9:16' ? 'Vertical 9:16' : 'Horizontal 16:9'} ({resolution})
                </p>
              </div>

              <div className="w-full bg-[#1e2230] rounded-full h-2.5 overflow-hidden border border-[#2b3044]">
                <div
                  className="bg-gradient-to-r from-[#00d2d3] to-[#0984e3] h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right text-xs font-mono text-cyan-400 font-bold">
                {progress}%
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Aspect Ratio */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">
                  1. Formato de Exportação
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all text-center ${
                      aspectRatio === '9:16'
                        ? 'bg-[#1b2535] border-[#00d2d3] text-white ring-1 ring-[#00d2d3]'
                        : 'bg-[#181a24] border-[#272c3d] text-gray-400 hover:text-gray-200 hover:border-[#383e54]'
                    }`}
                  >
                    <Smartphone className="w-6 h-6 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold text-gray-100">Vertical (9:16)</div>
                      <div className="text-[10px] text-gray-400">TikTok, Reels, Shorts</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all text-center ${
                      aspectRatio === '16:9'
                        ? 'bg-[#1b2535] border-[#00d2d3] text-white ring-1 ring-[#00d2d3]'
                        : 'bg-[#181a24] border-[#272c3d] text-gray-400 hover:text-gray-200 hover:border-[#383e54]'
                    }`}
                  >
                    <Monitor className="w-6 h-6 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold text-gray-100">Horizontal (16:9)</div>
                      <div className="text-[10px] text-gray-400">YouTube, TV, Cinema</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Resolution & FPS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    2. Resolução
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#181a24] p-1 rounded-xl border border-[#272c3d]">
                    <button
                      onClick={() => setResolution('1080p')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        resolution === '1080p'
                          ? 'bg-[#252b3d] text-[#00d2d3] shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      1080p Full HD
                    </button>
                    <button
                      onClick={() => setResolution('720p')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        resolution === '720p'
                          ? 'bg-[#252b3d] text-[#00d2d3] shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      720p HD
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    3. Taxa de Quadros
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#181a24] p-1 rounded-xl border border-[#272c3d]">
                    <button
                      onClick={() => setFps(30)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        fps === 30
                          ? 'bg-[#252b3d] text-[#00d2d3] shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      30 FPS
                    </button>
                    <button
                      onClick={() => setFps(60)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        fps === 60
                          ? 'bg-[#252b3d] text-[#00d2d3] shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      60 FPS
                    </button>
                  </div>
                </div>
              </div>

              {/* Start Export Button */}
              <button
                onClick={handleStartExport}
                className="w-full mt-2 py-3 bg-gradient-to-r from-[#00d2d3] to-[#0984e3] hover:from-[#00b4b5] hover:to-[#076ec0] text-gray-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-98 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-gray-950 stroke-[2.5]" />
                <span>Exportar Vídeo ({aspectRatio})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
