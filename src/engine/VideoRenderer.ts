import type { AspectRatio, TimelineClip, TransitionType } from '../types/editor';

export interface DrawOptions {
  aspectRatio: AspectRatio;
  fitMode: 'contain' | 'cover';
}

export type DrawableMedia = HTMLVideoElement | HTMLImageElement;

export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;
  }

  public resize(width: number, height: number) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  public clear() {
    this.ctx.fillStyle = '#050508';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Build CSS filter string from clip filter settings
  private getFilterString(clip: TimelineClip): string {
    const f = clip.filter || { brightness: 1, contrast: 1, saturation: 1, preset: 'normal' };
    const parts: string[] = [];

    if (f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
    if (f.contrast !== 1) parts.push(`contrast(${f.contrast})`);
    if (f.saturation !== 1) parts.push(`saturate(${f.saturation})`);

    switch (f.preset) {
      case 'bw':
        parts.push('grayscale(100%)');
        break;
      case 'vintage':
        parts.push('sepia(60%) contrast(110%) saturate(120%)');
        break;
      case 'warm':
        parts.push('sepia(25%) saturate(130%)');
        break;
      case 'cool':
        parts.push('hue-rotate(180deg) saturate(90%)');
        break;
      case 'cinema':
        parts.push('contrast(125%) saturate(115%)');
        break;
      case 'vibrant':
        parts.push('saturate(160%) contrast(105%)');
        break;
    }

    return parts.length > 0 ? parts.join(' ') : 'none';
  }

  // Draw a single video or image element onto the canvas with letterbox or cover
  public drawMedia(
    media: DrawableMedia,
    clip: TimelineClip,
    options: DrawOptions,
    alpha = 1,
    offsetX = 0,
    offsetY = 0,
    scale = 1,
    clearBg = true
  ) {
    if (media instanceof HTMLVideoElement && media.readyState < 2) return;
    if (media instanceof HTMLImageElement && (!media.complete || media.naturalWidth === 0)) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const vw = media instanceof HTMLVideoElement ? (media.videoWidth || cw) : (media.naturalWidth || cw);
    const vh = media instanceof HTMLVideoElement ? (media.videoHeight || ch) : (media.naturalHeight || ch);

    const ctx = this.ctx;
    const fit = options.fitMode || clip.fitMode || 'contain';

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.filter = this.getFilterString(clip);

    if (fit === 'cover') {
      // Zoom to fill canvas
      const scaleFactor = Math.max(cw / vw, ch / vh) * scale;
      const dw = vw * scaleFactor;
      const dh = vh * scaleFactor;
      const dx = (cw - dw) / 2 + offsetX;
      const dy = (ch - dh) / 2 + offsetY;
      ctx.drawImage(media, dx, dy, dw, dh);
    } else {
      // 'contain': Fit entire media without cropping
      if (clearBg) {
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, cw, ch);
      }

      const scaleFactor = Math.min(cw / vw, ch / vh) * scale;
      const dw = vw * scaleFactor;
      const dh = vh * scaleFactor;
      const dx = (cw - dw) / 2 + offsetX;
      const dy = (ch - dh) / 2 + offsetY;

      ctx.drawImage(media, dx, dy, dw, dh);
    }

    ctx.restore();
  }

  // Render transition between two clips
  public renderTransition(
    mediaA: DrawableMedia,
    clipA: TimelineClip,
    mediaB: DrawableMedia,
    clipB: TimelineClip,
    progress: number, // 0 to 1
    type: TransitionType,
    options: DrawOptions
  ) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const ctx = this.ctx;
    const p = Math.max(0, Math.min(1, progress));

    // Clear background once for contain mode
    if (options.fitMode === 'contain') {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, cw, ch);
    }

    switch (type) {
      case 'fade': {
        // Crossfade
        this.drawMedia(mediaA, clipA, options, 1 - p, 0, 0, 1, false);
        this.drawMedia(mediaB, clipB, options, p, 0, 0, 1, false);
        break;
      }

      case 'fadeblack': {
        // Dip to Black
        if (p < 0.5) {
          const a = (0.5 - p) / 0.5;
          this.drawMedia(mediaA, clipA, options, a, 0, 0, 1, false);
        } else {
          const a = (p - 0.5) / 0.5;
          this.drawMedia(mediaB, clipB, options, a, 0, 0, 1, false);
        }
        break;
      }

      case 'fadewhite': {
        // Dip to White / Flash
        if (p < 0.5) {
          this.drawMedia(mediaA, clipA, options, 1, 0, 0, 1, false);
          ctx.fillStyle = `rgba(255, 255, 255, ${p / 0.5})`;
          ctx.fillRect(0, 0, cw, ch);
        } else {
          this.drawMedia(mediaB, clipB, options, 1, 0, 0, 1, false);
          ctx.fillStyle = `rgba(255, 255, 255, ${(1 - p) / 0.5})`;
          ctx.fillRect(0, 0, cw, ch);
        }
        break;
      }

      case 'slideleft': {
        const offA = -p * cw;
        const offB = (1 - p) * cw;
        this.drawMedia(mediaA, clipA, options, 1, offA, 0, 1, false);
        this.drawMedia(mediaB, clipB, options, 1, offB, 0, 1, false);
        break;
      }

      case 'slideright': {
        const offA = p * cw;
        const offB = -(1 - p) * cw;
        this.drawMedia(mediaA, clipA, options, 1, offA, 0, 1, false);
        this.drawMedia(mediaB, clipB, options, 1, offB, 0, 1, false);
        break;
      }

      case 'wipeleft': {
        this.drawMedia(mediaA, clipA, options, 1, 0, 0, 1, false);
        ctx.save();
        ctx.beginPath();
        const splitX = cw * (1 - p);
        ctx.rect(splitX, 0, cw - splitX, ch);
        ctx.clip();
        this.drawMedia(mediaB, clipB, options, 1, 0, 0, 1, false);
        ctx.restore();
        break;
      }

      case 'wiperight': {
        this.drawMedia(mediaA, clipA, options, 1, 0, 0, 1, false);
        ctx.save();
        ctx.beginPath();
        const splitX = cw * p;
        ctx.rect(0, 0, splitX, ch);
        ctx.clip();
        this.drawMedia(mediaB, clipB, options, 1, 0, 0, 1, false);
        ctx.restore();
        break;
      }

      case 'zoomin': {
        const scaleA = 1 + p * 0.4;
        this.drawMedia(mediaA, clipA, options, 1 - p, 0, 0, scaleA, false);
        this.drawMedia(mediaB, clipB, options, p, 0, 0, 1, false);
        break;
      }

      default:
        this.drawMedia(mediaA, clipA, options, 1 - p, 0, 0, 1, false);
        this.drawMedia(mediaB, clipB, options, p, 0, 0, 1, false);
        break;
    }
  }
}
