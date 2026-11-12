/**
 * P115 HST-016 — one wake for a backend's three schedulers (triggers, scheduled backups, the orphan sweep).
 *
 * Each `CronScheduler` in wake mode reports the earliest instant IT is due; a host has one alarm (a Durable Object
 * has exactly one), so this keeps each scheduler's instant and tells the host the earliest of them, only when that
 * changes. `fireDue()` asks every scheduler to fire what is due and resolves when the runs have settled.
 *
 * @module nodegx-backend/triggers/scheduleClock
 */
import type { ScheduleWake } from '../config';

export class ScheduleClock {
  private readonly instants = new Map<string, number | null>();
  private readonly firers: Array<() => Promise<void>> = [];
  private told: number | null | undefined = undefined;

  constructor(private readonly host: ScheduleWake) {}

  /** The `wake` one scheduler is given, under its own name. */
  wakeFor(name: string): (at: Date | null) => void {
    this.instants.set(name, null);
    return (at) => {
      this.instants.set(name, at ? at.getTime() : null);
      this.tell();
    };
  }

  /** A scheduler's `fireDue`, called on every wake. */
  register(fireDue: () => Promise<void>): void {
    this.firers.push(fireDue);
  }

  async fireDue(): Promise<void> {
    await Promise.all(this.firers.map((f) => f()));
  }

  private tell(): void {
    let min: number | null = null;
    for (const at of this.instants.values()) if (at !== null && (min === null || at < min)) min = at;
    if (min === this.told) return;
    this.told = min;
    this.host(min === null ? null : new Date(min));
  }
}
