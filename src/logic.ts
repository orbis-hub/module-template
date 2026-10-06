/**
 * Pure logic, no sdk imports: easy to unit-test (see logic.test.ts) and shared by routes and the e-ink tap.
 * Keep your module's rules here and the http/storage wiring in server.ts.
 */

export const STEP_MAX = 100;

export function nextValue(current: number, step: number): number {
  return current + step;
}

/** the milestone (a multiple of `every`) passed when going from `prev` to `next`, or null */
export function crossedMilestone(prev: number, next: number, every: number): number | null {
  if (every <= 0 || next <= prev) return null;
  const reached = Math.floor(next / every) * every;
  return reached > prev && reached > 0 ? reached : null;
}
