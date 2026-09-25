/**
 * FileSubsystem — the composition root for BAK-006, owned by BackendService.
 *
 * Mirrors `BackupSubsystem` deliberately (its own module doc: "the SAME way
 * TriggerSubsystem does — ONE scheduler class, two consumers" — this makes it
 * three): constructs a `CronScheduler` and drives it with a sweep-specific
 * registry + dispatcher, so the orphan sweep's "when does it run" logic is the
 * SAME tested `computeStartPlan`/missed-fire/timer-chunking code as trigger
 * schedules and scheduled backups. No second cron loop.
 *
 * Also where the driver gets chosen — exactly once, from `FileConfigStore` +
 * `SecretsStore` (S3 credentials never live in the diffable files.json) — so
 * `FileRoutes` only ever sees a `StorageDriver`, never a driver-type branch.
 *
 * BMG-015: two stores can hold files at once. Switching the driver never moves
 * a blob (`BACKEND-FILES.md` §Drivers), so the local store stays alive beside
 * the bucket and a file is served by the driver its `_Files` row names
 * (`driverFor`), not by whichever is current — before this, a switch to the
 * bucket made every file uploaded before it a 500. `getDriver()` is where the
 * NEXT upload goes; `stores()` is everything the orphan sweep must walk;
 * `bucketDriver()` is the bucket the backups share (one bucket, one set of
 * credentials, typed once on the Storage page).
 *
 * @module nodegx-backend/storage/FileSubsystem
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { ExecutionHistory } from '../execution/ExecutionStore';
import type { SecretsStore } from '../config/SecretsStore';
import {
  describeMissingSecret,
  FILES_SIGNING_SECRET_ENV,
  readProvisionedSecret,
  SecretProvenance,
  SecretsStartupError
} from '../config/provisioned-secrets';
import { CronScheduler, SchedulerRegistry, SchedulerDispatcher } from '../triggers/scheduler';
import type { FireInput, FireOutcome, RejectionInput, TriggerResultShape } from '../triggers/dispatcher';
import type { TriggerDef } from '../triggers/registry';
import { validateCron } from '../triggers/cron';
import { FileConfigStore, DriverConfig, OrphanSweepSchedule, ThumbPreset } from './config';
import { LocalDriver } from './LocalDriver';
import { S3Driver } from './S3Driver';
import type { S3ProbeResult } from './S3Driver';
import type { StorageDriver } from './types';
import { MetadataStore } from './MetadataStore';
import type { FileRecord } from './MetadataStore';
import { runOrphanSweep } from './orphanSweep';
import { loadTransformer } from './transform';

export const FILE_SWEEP_TRIGGER_ID = '__file_orphan_sweep__';
export const FILES_SECRETS_NAMESPACE = 'files';

export type S3DriverConfigShape = Extract<DriverConfig, { type: 's3' }>;
export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

/** The stored bucket credentials (`files` namespace of secrets.json), or null when either half is missing. */
export function storedS3Credentials(secrets: SecretsStore): S3Credentials | null {
  const accessKeyId = secrets.get(FILES_SECRETS_NAMESPACE, 's3AccessKeyId') || '';
  const secretAccessKey = secrets.get(FILES_SECRETS_NAMESPACE, 's3SecretAccessKey') || '';
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : null;
}

/**
 * BMG-015: the bucket a data dir is connected to, or null when files.json says
 * `local`. The ONE place a bucket driver is built — the service (through the
 * subsystem) and the CLI's backup manager both come here, so the backups and
 * the uploads can never disagree about which bucket.
 */
export function buildBucketDriver(driverConfig: DriverConfig, secrets: SecretsStore, credentials?: S3Credentials | null): S3Driver | null {
  if (driverConfig.type !== 's3') return null;
  const creds = credentials || storedS3Credentials(secrets) || { accessKeyId: '', secretAccessKey: '' };
  return new S3Driver({
    endpoint: driverConfig.endpoint,
    region: driverConfig.region,
    bucket: driverConfig.bucket,
    forcePathStyle: driverConfig.forcePathStyle,
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey
  });
}

/** Adapter: presents the orphan-sweep schedule as a schedule "trigger" to CronScheduler. */
class SweepScheduleRegistry implements SchedulerRegistry {
  constructor(private readonly config: FileConfigStore) {}

  private synthetic(): TriggerDef | null {
    const sweep = this.config.get().orphanSweep;
    if (!sweep || !sweep.enabled || !sweep.cron) return null;
    const status = this.config.get().sweepStatus;
    return {
      id: FILE_SWEEP_TRIGGER_ID,
      type: 'schedule',
      name: 'File orphan sweep',
      enabled: true,
      target: { kind: 'function', name: '__file_orphan_sweep__' },
      schedule: { cron: sweep.cron, missedFirePolicy: 'skip' },
      createdAt: status.lastReport?.at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: {
        lastFiredAt: status.lastReport?.at || null,
        nextFireAt: status.nextRunAt,
        lastResult: status.lastReport ? { ok: !status.lastReport.error, at: status.lastReport.at, error: status.lastReport.error } : null,
        fireCount: 0
      }
    };
  }

  byType(type: string): TriggerDef[] {
    if (type !== 'schedule') return [];
    const t = this.synthetic();
    return t ? [t] : [];
  }

  get(id: string): TriggerDef | null {
    return id === FILE_SWEEP_TRIGGER_ID ? this.synthetic() : null;
  }

  setNextFire(id: string, nextFireAt: string | null): void {
    if (id === FILE_SWEEP_TRIGGER_ID) this.config.setNextSweepRun(nextFireAt);
  }
}

/** Adapter: the scheduler's fire() runs a (report-only) sweep and records loudly. */
class SweepScheduleDispatcher implements SchedulerDispatcher {
  constructor(
    private readonly stores: () => StorageDriver[],
    private readonly metadata: MetadataStore,
    private readonly config: FileConfigStore,
    private readonly executions: ExecutionHistory,
    private readonly backendId: string,
    private readonly backendName: string
  ) {}

  async fire(input: FireInput): Promise<FireOutcome> {
    const logger = this.executions.createLogger();
    if (logger) {
      try {
        logger.startExecution({
          workflowId: '__file_orphan_sweep__',
          workflowName: 'File orphan sweep',
          triggerType: 'schedule',
          triggerData: { source: input.source },
          metadata: { kind: 'maintenance', backendId: this.backendId, backendName: this.backendName, operation: 'file-orphan-sweep' }
        });
      } catch {
        /* logging must never block the sweep */
      }
    }
    const report = await runOrphanSweep(this.stores(), this.metadata, { delete: false });
    this.config.recordSweep(report);
    if (logger) {
      try {
        logger.completeExecution(!report.error, report.error ? new Error(report.error) : undefined);
      } catch {
        /* ignore */
      }
    }
    const result: TriggerResultShape = report.error
      ? { ok: false, at: report.at, error: report.error }
      : { ok: true, at: report.at };
    return {
      result,
      statusCode: report.error ? 500 : 200,
      body: JSON.stringify({ ok: !report.error, orphanBlobs: report.orphanBlobs.length, orphanRows: report.orphanRows.length })
    };
  }

  recordRejection(input: RejectionInput): TriggerResultShape {
    const at = new Date().toISOString();
    const logger = this.executions.createLogger();
    if (logger) {
      try {
        logger.startExecution({
          workflowId: input.workflowId,
          workflowName: 'File orphan sweep (schedule)',
          triggerType: 'schedule',
          triggerData: input.triggerData,
          metadata: { kind: 'maintenance', backendId: this.backendId, backendName: this.backendName, operation: 'file-orphan-sweep', triggerSource: input.source, rejected: true }
        });
        logger.completeExecution(false, new Error(input.reason));
      } catch {
        /* a logging failure must never propagate */
      }
    }
    return { ok: false, at, error: input.reason };
  }
}

export interface FileSubsystemDeps {
  dataDir: string;
  facade: import('@noodl/backend-contract').IStorageFacade;
  secrets: SecretsStore;
  executions: ExecutionHistory;
  backendId: string;
  backendName: string;
  /** PRD-005: refuse to start rather than mint the signed-URL secret. See `verifyProvisionedSecrets`. */
  requireSecrets?: boolean;
}

export class FileSubsystem {
  readonly config: FileConfigStore;
  readonly metadata: MetadataStore;
  private readonly deps: FileSubsystemDeps;
  private signingProvenance: SecretProvenance | null = null;
  /** Always there: the store beside the data dir. Files uploaded before a switch to the bucket live here. */
  private readonly local: LocalDriver;
  /** The bucket, when files.json names one. Shared with the backups. */
  private bucket: S3Driver | null = null;
  /** Where the NEXT upload goes: the bucket when configured, else the local store. */
  private driver: StorageDriver;
  private readonly registry: SweepScheduleRegistry;
  private readonly scheduler: CronScheduler;

  constructor(deps: FileSubsystemDeps) {
    this.deps = deps;
    this.config = new FileConfigStore(deps.dataDir);
    this.metadata = new MetadataStore(deps.facade);
    this.local = new LocalDriver(path.join(deps.dataDir, 'files', 'blobs'));
    this.driver = this.local;
    this.applyDriver(this.config.get().driver);
    this.registry = new SweepScheduleRegistry(this.config);
    const dispatcher = new SweepScheduleDispatcher(
      () => this.stores(),
      this.metadata,
      this.config,
      deps.executions,
      deps.backendId,
      deps.backendName
    );
    this.scheduler = new CronScheduler({ registry: this.registry, dispatcher });
  }

  /** (Re)build the bucket driver from a driver config + the stored credentials, and point the next upload at it. */
  private applyDriver(driverConfig: DriverConfig): void {
    this.bucket = buildBucketDriver(driverConfig, this.deps.secrets);
    this.driver = this.bucket || this.local;
  }

  /** Where the next upload goes. */
  getDriver(): StorageDriver {
    return this.driver;
  }

  /** The bucket this backend is connected to (files.json `driver.type === 's3'`), or null. Backups share it. */
  bucketDriver(): S3Driver | null {
    return this.bucket;
  }

  /** Every store that can hold a file right now — what the orphan sweep walks. */
  stores(): StorageDriver[] {
    return this.bucket ? [this.local, this.bucket] : [this.local];
  }

  /**
   * The driver that holds THIS file: the one its `_Files` row names. A row
   * that says `s3` while no bucket is connected is a loud error, not a 404 —
   * the bytes exist, the backend just cannot reach them.
   */
  driverFor(record: Pick<FileRecord, 'driver' | 'storedName'>): StorageDriver {
    if (record.driver === 's3') {
      if (!this.bucket) {
        throw new Error(
          `"${record.storedName}" is stored in a bucket this backend is no longer connected to. Connect the bucket again on the Storage page to serve it.`
        );
      }
      return this.bucket;
    }
    return this.local;
  }

  /** Both halves of the bucket credential are stored. Never the values. */
  s3CredentialsConfigured(): boolean {
    return storedS3Credentials(this.deps.secrets) !== null;
  }

  /**
   * BMG-015: *Test connection*. A throwaway driver over `driverConfig` with
   * `credentials` (the unsaved ones a person just typed) or the stored ones;
   * nothing here is persisted.
   */
  probeBucket(driverConfig: S3DriverConfigShape, credentials?: S3Credentials | null): Promise<S3ProbeResult> {
    const driver = buildBucketDriver(driverConfig, this.deps.secrets, credentials);
    if (!driver) return Promise.resolve({ ok: false, error: 'No bucket to test.' });
    if (!driver.hasCredentials()) {
      return Promise.resolve({ ok: false, error: 'The bucket needs an access key id and a secret access key.' });
    }
    return driver.probe();
  }

  /**
   * The HMAC secret for signed file URLs (./signing.ts).
   *
   * PRD-005: `NODEGX_FILES_SIGNING_SECRET` (or its `_FILE` form) wins and is never written to
   * secrets.json; then the file; then — unless the deploy said not to — a mint. The mint used
   * to happen on the first signed URL; `verifyProvisionedSecrets` now settles it at startup,
   * so a deploy that must not invent one refuses before the port opens rather than on a
   * request a week later.
   */
  getSigningSecret(): string {
    const fromEnv = readProvisionedSecret(FILES_SIGNING_SECRET_ENV);
    if (fromEnv) {
      this.signingProvenance = { source: fromEnv.source, persisted: false };
      return fromEnv.value;
    }
    const existing = this.deps.secrets.get(FILES_SECRETS_NAMESPACE, 'signingSecret');
    if (existing) {
      if (!this.signingProvenance) this.signingProvenance = { source: 'file', persisted: true };
      return existing;
    }
    if (this.deps.requireSecrets) {
      throw new SecretsStartupError(
        'SECRET_NOT_PROVISIONED',
        describeMissingSecret({
          name: 'files.signingSecret',
          purpose: 'the HMAC key behind every signed file URL — a different key invalidates every link already handed out',
          envName: FILES_SIGNING_SECRET_ENV,
          cliFlag: null,
          secretsPath: path.join(this.deps.dataDir, 'secrets.json'),
          fileKey: '"files" → "signingSecret"'
        })
      );
    }
    const minted = crypto.randomBytes(32).toString('base64url');
    this.deps.secrets.set(FILES_SECRETS_NAMESPACE, 'signingSecret', minted);
    this.signingProvenance = { source: 'generated', persisted: true };
    return minted;
  }

  /**
   * PRD-005: resolve the signing secret NOW. Under the production stance a missing one is a
   * startup refusal; under the default stance it is minted here instead of on first use. Called
   * by the service before the HTTP surface opens.
   */
  verifyProvisionedSecrets(): void {
    this.getSigningSecret();
  }

  /** Where the signing secret came from. `absent` only before `verifyProvisionedSecrets` has run. */
  signingSecretProvenance(): SecretProvenance {
    return this.signingProvenance || { source: 'absent', persisted: false };
  }

  /** Whether image transforms are available right now (sharp loaded), and why not if not. */
  transformStatus(): { available: boolean; reason?: string } {
    const loaded = loadTransformer();
    return loaded.available ? { available: true } : { available: false, reason: loaded.reason };
  }

  setS3Credentials(accessKeyId: string, secretAccessKey: string): void {
    this.deps.secrets.set(FILES_SECRETS_NAMESPACE, 's3AccessKeyId', accessKeyId);
    this.deps.secrets.set(FILES_SECRETS_NAMESPACE, 's3SecretAccessKey', secretAccessKey);
    this.applyDriver(this.config.get().driver);
  }

  updateConfig(patch: Parameters<FileConfigStore['update']>[0]): ReturnType<FileConfigStore['update']> {
    const updated = this.config.update(patch);
    // A driver change (or its secrets changing via setS3Credentials) must take
    // effect immediately, not just on next restart.
    this.applyDriver(updated.driver);
    this.reschedule();
    return updated;
  }

  setOrphanSweepSchedule(schedule: OrphanSweepSchedule): void {
    if (schedule.enabled) {
      const err = validateCron(schedule.cron);
      if (err) throw new Error(`Invalid orphan-sweep schedule cron: ${err}`);
    }
    this.config.update({ orphanSweep: schedule });
    this.reschedule();
  }

  setPresets(presets: Record<string, ThumbPreset>): void {
    this.config.update({ thumbnails: { presets } });
  }

  /**
   * Where `FileRoutes` caches a file's rendered thumbnails, by content hash.
   * One spelling, here, so the two deleters (the public route and BMG-011's
   * admin route) invalidate the same directory.
   */
  thumbCacheDir(hash: string): string {
    return path.join(this.deps.dataDir, 'files', 'thumbs', hash);
  }

  /**
   * Remove a stored file: the blob, its metadata row, and its cached
   * thumbnails (BMG-011). The one implementation behind `DELETE /files/:name`
   * and `DELETE /admin/files/:name`; the callers decide WHO may, this decides
   * WHAT goes. The cache goes last and best-effort: a leftover thumbnail is a
   * few kilobytes nothing serves, a leftover row is an orphan the sweep reports.
   */
  async deleteStored(record: FileRecord): Promise<void> {
    await this.driverFor(record).delete(record.key);
    await this.metadata.deleteById(record.objectId);
    const cacheDir = this.thumbCacheDir(record.hash);
    if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
  }

  /** Run the sweep right now, outside the schedule (admin/MCP "run now"). */
  async runSweepNow(deleteOrphans = false): Promise<ReturnType<typeof runOrphanSweep> extends Promise<infer R> ? R : never> {
    const report = await runOrphanSweep(this.stores(), this.metadata, { delete: deleteOrphans });
    this.config.recordSweep(report);
    return report;
  }

  start(): void {
    this.scheduler.start();
  }

  reschedule(): void {
    this.scheduler.reschedule();
  }

  stop(): void {
    this.scheduler.stop();
  }
}
