/**
 * P107-C19 — one timer's callback must not stop the others.
 *
 * `runTimers` reassigns `runningTimers` and joins `newTimers` only after its loop, and its caller
 * (`NodeContext.update`) does not catch. So a timer whose `onRunning` threw every frame — an
 * Animate To Value with an Easing Curve the set did not have — held every other timer where it
 * was, every frame: other animations froze, Repeat never ticked again. Each callback is now caught
 * and logged, as `updateDirtyNodes` already does for a node's update.
 */
import TimerScheduler = require('../src/timerscheduler');

type Scheduler = {
  createTimer(args: Record<string, unknown>): { start(): void; isRunning(): boolean };
  runTimers(now: number): void;
  hasPendingTimers(): boolean;
};

const makeScheduler = (): Scheduler => new (TimerScheduler as unknown as { new (requestFrame: () => void): Scheduler })(() => undefined);

describe('P107-C19 — the timer pass survives one timer throwing', () => {
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  test('a timer whose onRunning throws every frame does not stop another timer running, finishing, or a new one joining', () => {
    const scheduler = makeScheduler();
    const good: number[] = [];
    let goodFinished = 0;
    let lateStarted = 0;

    scheduler.createTimer({ duration: 100, onRunning: () => { throw new TypeError('this.ease is not a function'); } }).start();
    scheduler.createTimer({ duration: 100, onRunning: (t: number) => good.push(t), onFinish: () => goodFinished++ }).start();

    scheduler.runTimers(0); // both join; delay 0 runs onRunning(0) at once
    scheduler.runTimers(50);
    const late = scheduler.createTimer({ duration: 10, onStart: () => lateStarted++ });
    late.start();
    scheduler.runTimers(100);

    expect(good).toEqual([0, 0.5, 1]);
    expect(goodFinished).toBe(1);
    expect(lateStarted).toBe(1);
    expect(late.isRunning()).toBe(true);
    // the throw is reported, not swallowed
    expect(errorSpy).toHaveBeenCalled();
  });

  test('a throwing onStart or onFinish does not stop the timers after it', () => {
    const scheduler = makeScheduler();
    const finished: string[] = [];

    scheduler.createTimer({ duration: 10, onStart: () => { throw new Error('start'); } }).start();
    scheduler.createTimer({ duration: 10, onFinish: () => { throw new Error('finish'); } }).start();
    scheduler.createTimer({ duration: 10, onFinish: () => finished.push('third') }).start();

    scheduler.runTimers(0);
    scheduler.runTimers(10);

    expect(finished).toEqual(['third']);
    expect(scheduler.hasPendingTimers()).toBe(false);
  });
});
