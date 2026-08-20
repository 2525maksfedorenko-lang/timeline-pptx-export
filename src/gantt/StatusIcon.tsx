import { Circle, CircleCheck, Clock, Pause } from 'lucide-react';
import type { TaskStatus } from '../types/timeline';
import { STATUS_ICON_COLOR } from './tone';

/** The glyph a row wears for its status.
 *
 * The handoff draws these as inline paths and then says, in as many words, to
 * use `lucide-react` instead of copying them — so each one here is the lucide
 * icon whose path the prototype had transcribed: a ringed check for done, a
 * clock face for in progress, a bare circle for not started, and two upright
 * bars for blocked. 19px at stroke 1.9, its own numbers. */
const ICON: Record<TaskStatus, typeof Circle> = {
  done: CircleCheck,
  in_progress: Clock,
  todo: Circle,
  blocked: Pause,
};

export function StatusIcon({ status }: { status: TaskStatus }) {
  const Glyph = ICON[status];
  return <Glyph size={19} strokeWidth={1.9} color={STATUS_ICON_COLOR[status]} aria-hidden="true" />;
}
