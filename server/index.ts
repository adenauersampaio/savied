import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const PUBLIC_DIR = path.resolve('public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const EXPORTS_DIR = path.join(PUBLIC_DIR, 'exports');
const THUMBNAILS_DIR = path.join(PUBLIC_DIR, 'thumbnails');

// Ensure directories exist
[PUBLIC_DIR, UPLOADS_DIR, EXPORTS_DIR, THUMBNAILS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static assets from public/
app.use(express.static(PUBLIC_DIR));

// Multer storage for media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

interface ExportJob {
  id: string;
  status: 'processing' | 'done' | 'error';
  progress: number;
  downloadUrl?: string;
  outputPath?: string;
  error?: string;
  totalDuration?: number;
}

const jobs = new Map<string, ExportJob>();

// Helper to probe media information via ffprobe
async function probeMedia(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const isImageExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);
  const isAudioExt = ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'].includes(ext);

  if (isImageExt) {
    try {
      const { stdout } = await execPromise(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${filePath}"`
      );
      const data = JSON.parse(stdout);
      const v = data.streams?.[0];
      return {
        type: 'image' as const,
        duration: 4,
        width: v?.width || 1920,
        height: v?.height || 1080,
        hasAudio: false,
        hasVideo: true,
      };
    } catch {
      return {
        type: 'image' as const,
        duration: 4,
        width: 1920,
        height: 1080,
        hasAudio: false,
        hasVideo: true,
      };
    }
  }

  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration:stream=width,height,codec_type -of json "${filePath}"`
    );
    const data = JSON.parse(stdout);
    const duration = parseFloat(data.format?.duration || '0');
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

    if (isAudioExt || (!videoStream && audioStream)) {
      return {
        type: 'audio' as const,
        duration: Math.max(0.5, duration),
        width: 0,
        height: 0,
        hasAudio: true,
        hasVideo: false,
      };
    }

    return {
      type: 'video' as const,
      duration: Math.max(0.5, duration),
      width: videoStream?.width || 1920,
      height: videoStream?.height || 1080,
      hasAudio: !!audioStream,
      hasVideo: !!videoStream,
    };
  } catch (err) {
    console.error('Error probing media:', err);
    return {
      type: (isAudioExt ? 'audio' : 'video') as any,
      duration: 5,
      width: 1920,
      height: 1080,
      hasAudio: true,
      hasVideo: !isAudioExt,
    };
  }
}

// 1. Get sample media items (empty by default as requested: "vídeos testes fossem removidos")
app.get('/api/samples', (_req, res) => {
  res.json([]);
});

// 2. Upload media file(s) (video, audio, or image) - supports multiple files
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    const rawFiles = (req.files as Express.Multer.File[]) || [];
    if (rawFiles.length === 0 && (req as any).file) {
      rawFiles.push((req as any).file);
    }

    if (rawFiles.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const items = await Promise.all(
      rawFiles.map(async (file) => {
        const filePath = file.path;
        const filename = file.filename;
        const ext = path.extname(filename).toLowerCase();
        const id = path.basename(filename, ext);

        const probe = await probeMedia(filePath);

        let thumbnailUrl = '';

        if (probe.type === 'video') {
          const thumbName = `${id}.jpg`;
          const thumbPath = path.join(THUMBNAILS_DIR, thumbName);
          const thumbTime = Math.min(1, Math.max(0.1, probe.duration / 3));
          try {
            await execPromise(
              `ffmpeg -y -ss ${thumbTime} -i "${filePath}" -vframes 1 -vf "scale=320:-1" "${thumbPath}"`
            );
            thumbnailUrl = `/thumbnails/${thumbName}`;
          } catch (err) {
            console.error('Thumbnail generation failed:', err);
          }
        } else if (probe.type === 'image') {
          thumbnailUrl = `/uploads/${filename}`;
        }

        return {
          id,
          name: file.originalname,
          url: `/uploads/${filename}`,
          thumbnailUrl,
          duration: probe.duration,
          width: probe.width,
          height: probe.height,
          type: probe.type,
          size: file.size,
        };
      })
    );

    // If single file, also return flat properties for backward compatibility
    if (items.length === 1) {
      return res.json({
        ...items[0],
        items,
      });
    }

    return res.json({
      items,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Export timeline endpoint (supporting video track + separate audio track)
app.post('/api/export', async (req, res) => {
  try {
    const {
      aspectRatio = '16:9',
      resolution = '1080p',
      fps = 30,
      fitMode = 'contain',
      clips = [],
      audioClips = [],
    } = req.body;

    if (!Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: 'Nenhum clipe na linha do tempo para exportar.' });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const outputFilename = `export_${jobId}.mp4`;
    const outputPath = path.join(EXPORTS_DIR, outputFilename);
    const downloadUrl = `/exports/${outputFilename}`;

    // Target dimensions
    let targetW = 1920;
    let targetH = 1080;
    if (aspectRatio === '9:16') {
      targetW = resolution === '720p' ? 720 : 1080;
      targetH = resolution === '720p' ? 1280 : 1920;
    } else {
      targetW = resolution === '720p' ? 1280 : 1920;
      targetH = resolution === '720p' ? 720 : 1080;
    }

    const job: ExportJob = {
      id: jobId,
      status: 'processing',
      progress: 0,
      downloadUrl,
      outputPath,
    };
    jobs.set(jobId, job);

    res.json({ jobId, status: 'processing', progress: 0 });

    // Run export in background
    runFfmpegExport(jobId, clips, audioClips, {
      targetW,
      targetH,
      fps,
      fitMode,
      outputPath,
      downloadUrl,
    }).catch((err) => {
      console.error(`Export failed for job ${jobId}:`, err);
      const j = jobs.get(jobId);
      if (j) {
        j.status = 'error';
        j.error = err.message || 'Erro durante a exportação.';
      }
    });
  } catch (err: any) {
    console.error('Export request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Job status endpoint
app.get('/api/export/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Trabalho de exportação não encontrado.' });
  }
  res.json(job);
});

function mapTransition(type: string): string {
  switch (type) {
    case 'fade':
      return 'fade';
    case 'fadeblack':
      return 'fadeblack';
    case 'fadewhite':
      return 'fadewhite';
    case 'slideleft':
      return 'slideleft';
    case 'slideright':
      return 'slideright';
    case 'wipeleft':
      return 'wipeleft';
    case 'wiperight':
      return 'wiperight';
    case 'zoomin':
      return 'zoomin';
    default:
      return 'fade';
  }
}

// Background FFmpeg export function
async function runFfmpegExport(
  jobId: string,
  clips: any[],
  audioClips: any[] = [],
  options: {
    targetW: number;
    targetH: number;
    fps: number;
    fitMode: string;
    outputPath: string;
    downloadUrl: string;
  }
) {
  const { targetW, targetH, fps, fitMode, outputPath, downloadUrl } = options;
  const job = jobs.get(jobId);
  if (!job) return;

  const clipDurations: number[] = [];
  const args: string[] = ['-y'];

  // Input files for video track
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    let resolved = clip.sourceUrl;
    if (resolved.startsWith('/')) {
      resolved = path.join(PUBLIC_DIR, resolved.replace(/^\//, ''));
    }
    if (!fs.existsSync(resolved)) {
      throw new Error(`Arquivo de mídia não encontrado: ${clip.sourceUrl}`);
    }

    const dur = Math.max(0.1, (clip.trimEnd || 5) - (clip.trimStart || 0));
    clipDurations.push(dur);

    const ext = path.extname(resolved).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);

    if (isImage) {
      args.push('-loop', '1', '-t', String(dur + 2), '-i', resolved);
    } else {
      args.push('-i', resolved);
    }
  }

  // Input files for separate audio track
  const audioInputOffset = clips.length;
  for (let i = 0; i < audioClips.length; i++) {
    const aClip = audioClips[i];
    let resolved = aClip.sourceUrl;
    if (resolved.startsWith('/')) {
      resolved = path.join(PUBLIC_DIR, resolved.replace(/^\//, ''));
    }
    if (!fs.existsSync(resolved)) {
      throw new Error(`Arquivo de áudio não encontrado: ${aClip.sourceUrl}`);
    }
    args.push('-i', resolved);
  }

  // Calculate total duration of video track
  let totalDuration = 0;
  for (let i = 0; i < clips.length; i++) {
    totalDuration += clipDurations[i];
    if (i < clips.length - 1 && clips[i].transitionOut && clips[i].transitionOut.type !== 'none') {
      const transDur = Math.min(
        clips[i].transitionOut.duration || 0.5,
        clipDurations[i] / 2,
        clipDurations[i + 1] / 2
      );
      totalDuration -= transDur;
    }
  }

  // Also account for any audio track extending past video duration
  for (const aClip of audioClips) {
    const aEnd = (aClip.startTime || 0) + ((aClip.trimEnd || aClip.sourceDuration) - (aClip.trimStart || 0));
    if (aEnd > totalDuration) {
      totalDuration = aEnd;
    }
  }

  job.totalDuration = Math.max(0.5, totalDuration);

  const filterParts: string[] = [];

  // 1. Process individual video clips
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const trimStart = Math.max(0, clip.trimStart || 0);
    const trimEnd = Math.max(trimStart + 0.1, clip.trimEnd || trimStart + clipDurations[i]);

    let videoFilter = `trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS`;

    if (clip.filter) {
      const b = clip.filter.brightness ?? 1;
      const c = clip.filter.contrast ?? 1;
      const s = clip.filter.saturation ?? 1;
      if (b !== 1 || c !== 1 || s !== 1) {
        const bOffset = (b - 1) * 0.5;
        videoFilter += `,eq=brightness=${bOffset}:contrast=${c}:saturation=${s}`;
      }
      if (clip.filter.preset === 'bw') {
        videoFilter += `,colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3`;
      } else if (clip.filter.preset === 'vintage') {
        videoFilter += `,curves=vintage`;
      }
    }

    if (fitMode === 'cover') {
      videoFilter += `,scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},setsar=1,fps=${fps}`;
    } else {
      videoFilter += `,scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps}`;
    }

    filterParts.push(`[${i}:v]${videoFilter}[v${i}]`);

    // Audio filter for video clip
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(
      path.extname(clip.sourceUrl).toLowerCase()
    );

    if (isImage || clip.isMuted) {
      filterParts.push(`aevalsrc=0:d=${clipDurations[i]}[a${i}]`);
    } else {
      const vol = Math.max(0, Math.min(2, clip.volume ?? 1));
      filterParts.push(`[${i}:a]atrim=start=${trimStart}:end=${trimEnd},asetpts=PTS-STARTPTS,volume=${vol}[a${i}]`);
    }
  }

  // 2. Chain video transitions
  let lastV = 'v0';
  let lastA = 'a0';
  let currentOffset = clipDurations[0];

  for (let i = 0; i < clips.length - 1; i++) {
    const nextIdx = i + 1;
    const nextV = `v${nextIdx}`;
    const nextA = `a${nextIdx}`;
    const outV = `v_out_${i}`;
    const outA = `a_out_${i}`;

    const trans = clips[i].transitionOut;
    const hasTransition = trans && trans.type && trans.type !== 'none';
    const transDur = hasTransition
      ? Math.min(trans.duration || 0.5, clipDurations[i] / 2, clipDurations[nextIdx] / 2)
      : 0;

    if (hasTransition && transDur > 0) {
      const transName = mapTransition(trans.type);
      const xfadeOffset = Math.max(0.01, currentOffset - transDur);

      filterParts.push(
        `[${lastV}][${nextV}]xfade=transition=${transName}:duration=${transDur}:offset=${xfadeOffset}[${outV}]`
      );
      filterParts.push(`[${lastA}][${nextA}]acrossfade=d=${transDur}[${outA}]`);

      lastV = outV;
      lastA = outA;
      currentOffset = currentOffset - transDur + clipDurations[nextIdx];
    } else {
      filterParts.push(
        `[${lastV}][${nextV}]xfade=transition=fade:duration=0.03:offset=${Math.max(0.01, currentOffset - 0.03)}[${outV}]`
      );
      filterParts.push(`[${lastA}][${nextA}]acrossfade=d=0.03[${outA}]`);

      lastV = outV;
      lastA = outA;
      currentOffset = currentOffset + clipDurations[nextIdx];
    }
  }

  // 3. Process separate audio track clips and mix into final audio
  let finalAudioStream = lastA;

  if (audioClips.length > 0) {
    const mixAudioStreams = [`[${lastA}]`];

    for (let j = 0; j < audioClips.length; j++) {
      const aClip = audioClips[j];
      const inputIdx = audioInputOffset + j;
      const tStart = Math.max(0, aClip.trimStart || 0);
      const tEnd = Math.max(tStart + 0.1, aClip.trimEnd || aClip.sourceDuration);
      const delayMs = Math.round(Math.max(0, aClip.startTime || 0) * 1000);
      const vol = aClip.isMuted ? 0 : Math.max(0, Math.min(2, aClip.volume ?? 1));

      const processedAudioLabel = `aud_track_${j}`;
      filterParts.push(
        `[${inputIdx}:a]atrim=start=${tStart}:end=${tEnd},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${vol}[${processedAudioLabel}]`
      );
      mixAudioStreams.push(`[${processedAudioLabel}]`);
    }

    const mixedOutLabel = 'a_final_mix';
    filterParts.push(
      `${mixAudioStreams.join('')}amix=inputs=${mixAudioStreams.length}:duration=longest:dropout_transition=0[${mixedOutLabel}]`
    );
    finalAudioStream = mixedOutLabel;
  }

  const filterComplex = filterParts.join(';\n');

  args.push(
    '-filter_complex',
    filterComplex,
    '-map',
    `[${lastV}]`,
    '-map',
    `[${finalAudioStream}]`,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-progress',
    'pipe:1',
    outputPath
  );

  console.log(`Starting FFmpeg export for job ${jobId}...`);

  return new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', args);

    let progressOutput = '';

    ff.stdout.on('data', (data) => {
      progressOutput += data.toString();
      const lines = progressOutput.split('\n');
      progressOutput = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('out_time_us=')) {
          const us = parseInt(line.replace('out_time_us=', '').trim(), 10);
          if (!isNaN(us) && job.totalDuration && job.totalDuration > 0) {
            const currentSec = us / 1000000;
            const pct = Math.min(99, Math.round((currentSec / job.totalDuration) * 100));
            job.progress = pct;
          }
        }
      }
    });

    let stderrOutput = '';
    ff.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    ff.on('close', (code) => {
      if (code === 0) {
        console.log(`Export job ${jobId} finished successfully!`);
        job.status = 'done';
        job.progress = 100;
        job.downloadUrl = downloadUrl;
        resolve();
      } else {
        console.error(`FFmpeg process failed with code ${code}. Stderr:`, stderrOutput);
        job.status = 'error';
        job.error = `FFmpeg failed with exit code ${code}`;
        reject(new Error(job.error));
      }
    });

    ff.on('error', (err) => {
      console.error(`Spawn error for job ${jobId}:`, err);
      job.status = 'error';
      job.error = err.message;
      reject(err);
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Savied Backend Server running at http://localhost:${PORT}`);
});
