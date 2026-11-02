export type AspectRatio = '16:9' | '9:16';

export type TransitionType =
  | 'none'
  | 'fade'       // Dissolver / Crossfade
  | 'fadeblack'  // Fade para Preto
  | 'fadewhite'  // Fade para Branco
  | 'slideleft'  // Deslizar para Esquerda
  | 'slideright' // Deslizar para Direita
  | 'wipeleft'   // Varredura para Esquerda
  | 'wiperight'  // Varredura para Direita
  | 'zoomin';    // Zoom de Transição

export interface ClipTransition {
  type: TransitionType;
  duration: number; // in seconds, e.g. 0.5s or 1.0s
}

export type FilterPreset = 'normal' | 'cinema' | 'vintage' | 'bw' | 'warm' | 'cool' | 'vibrant';

export interface VideoFilter {
  brightness: number; // 0.5 to 1.5, default 1
  contrast: number;   // 0.5 to 1.5, default 1
  saturation: number; // 0 to 2, default 1
  preset: FilterPreset;
}

export type MediaType = 'video' | 'audio' | 'image';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  width?: number;
  height?: number;
  type: MediaType;
  size?: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio';
  isMuted?: boolean;
  isLocked?: boolean;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  title: string;
  sourceUrl: string;
  sourceDuration: number;
  trimStart: number; // in seconds
  trimEnd: number;   // in seconds
  volume: number;    // 0 to 1
  isMuted: boolean;
  filter: VideoFilter;
  fitMode: 'contain' | 'cover';
  transitionOut: ClipTransition;
  thumbnailUrl?: string;
  type?: 'video' | 'image';
  hasAudioDetached?: boolean;
  trackId?: string; // target track ID (e.g. 'video-1', 'video-2')
}

export interface TimelineAudioClip {
  id: string;
  mediaId: string;
  title: string;
  sourceUrl: string;
  sourceDuration: number;
  startTime: number; // timeline start position in seconds
  trimStart: number; // in seconds relative to source
  trimEnd: number;   // in seconds relative to source
  volume: number;    // 0 to 1
  isMuted: boolean;
  isDetached?: boolean;
  parentClipId?: string;
  trackId?: string; // target track ID (e.g. 'audio-1', 'audio-2')
}

export interface ExportSettings {
  aspectRatio: AspectRatio;
  resolution: '1080p' | '720p';
  fps: 30 | 60;
  fitMode: 'contain' | 'cover';
}
