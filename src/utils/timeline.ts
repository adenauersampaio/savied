import type { TimelineClip } from '../types/editor';

export interface ClipSchedule {
  clip: TimelineClip;
  index: number;
  duration: number; // trimmed duration
  startTime: number; // timeline start
  endTime: number; // timeline end
  transitionDuration: number;
}

export function computeTimelineSchedule(clips: TimelineClip[]): {
  schedule: ClipSchedule[];
  totalDuration: number;
} {
  const schedule: ClipSchedule[] = [];
  let currentTime = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const duration = Math.max(0.1, clip.trimEnd - clip.trimStart);
    const hasTransition =
      i < clips.length - 1 &&
      clip.transitionOut &&
      clip.transitionOut.type !== 'none' &&
      clip.transitionOut.duration > 0;

    const nextClipDuration =
      i < clips.length - 1
        ? Math.max(0.1, clips[i + 1].trimEnd - clips[i + 1].trimStart)
        : 0;

    const transitionDuration = hasTransition
      ? Math.min(clip.transitionOut.duration, duration / 2, nextClipDuration / 2)
      : 0;

    const startTime = currentTime;
    const endTime = startTime + duration;

    schedule.push({
      clip,
      index: i,
      duration,
      startTime,
      endTime,
      transitionDuration,
    });

    // Next clip starts overlapping by transitionDuration
    currentTime = endTime - transitionDuration;
  }

  const totalDuration = schedule.length > 0 ? schedule[schedule.length - 1].endTime : 0;
  return { schedule, totalDuration };
}

export interface ActivePlaybackState {
  currentScheduleItem: ClipSchedule | null;
  nextScheduleItem: ClipSchedule | null;
  transitionProgress: number; // 0 to 1, or -1 if not in transition
  currentClipTime: number; // source time in current clip
  nextClipTime: number; // source time in next clip
}

export function getPlaybackStateAtTime(
  schedule: ClipSchedule[],
  time: number
): ActivePlaybackState {
  if (schedule.length === 0) {
    return {
      currentScheduleItem: null,
      nextScheduleItem: null,
      transitionProgress: -1,
      currentClipTime: 0,
      nextClipTime: 0,
    };
  }

  // Clamp time
  const maxTime = schedule[schedule.length - 1].endTime;
  const clampedTime = Math.max(0, Math.min(time, maxTime));

  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const nextItem = schedule[i + 1];

    // Check if in transition window between item and nextItem
    if (
      nextItem &&
      item.transitionDuration > 0 &&
      clampedTime >= nextItem.startTime &&
      clampedTime <= item.endTime
    ) {
      const window = item.endTime - nextItem.startTime;
      const progress = window > 0 ? (clampedTime - nextItem.startTime) / window : 0;
      const currentClipTime = item.clip.trimStart + (clampedTime - item.startTime);
      const nextClipTime = nextItem.clip.trimStart + (clampedTime - nextItem.startTime);

      return {
        currentScheduleItem: item,
        nextScheduleItem: nextItem,
        transitionProgress: Math.max(0, Math.min(1, progress)),
        currentClipTime,
        nextClipTime,
      };
    }

    // Check if within this item's solo playback window
    const soloEnd = nextItem ? nextItem.startTime : item.endTime;
    if (clampedTime >= item.startTime && clampedTime <= soloEnd) {
      const currentClipTime = item.clip.trimStart + (clampedTime - item.startTime);
      return {
        currentScheduleItem: item,
        nextScheduleItem: null,
        transitionProgress: -1,
        currentClipTime,
        nextClipTime: 0,
      };
    }
  }

  // Fallback to last item
  const lastItem = schedule[schedule.length - 1];
  return {
    currentScheduleItem: lastItem,
    nextScheduleItem: null,
    transitionProgress: -1,
    currentClipTime: lastItem.clip.trimEnd,
    nextClipTime: 0,
  };
}
