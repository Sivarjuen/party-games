import { PIPE_GAP_MIN_Y, PIPE_GAP_MAX_Y } from '../game/constants';

/**
 * Returns a random Y position (fraction 0..1) for the center of the pipe gap.
 */
export function randomPipeGapCenter(): number {
  return PIPE_GAP_MIN_Y + Math.random() * (PIPE_GAP_MAX_Y - PIPE_GAP_MIN_Y);
}
