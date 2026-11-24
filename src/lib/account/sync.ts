import { parseStoredState } from "@/lib/storage/schema";
import type { StorageSchema } from "@/types";
import { sameCloudState, threeWayMerge, toCloudState } from "./merge";

export interface CloudKitchen {
  pull(): Promise<{ data: unknown; revision: number } | null>;
  push(data: StorageSchema, expectedRevision: number | null): Promise<{ saved: boolean; revision: number | null }>;
}

export interface SyncedStore {
  readonly data: StorageSchema;
  replaceAll(state: StorageSchema): void;
  subscribe(listener: () => void): () => void;
}

export interface SyncMeta {
  revision: number | null;
  base: StorageSchema;
}

export interface SyncMetaStorage {
  load(): SyncMeta | null;
  save(meta: SyncMeta): void;
  clear(): void;
}

export type SyncStatus = "idle" | "syncing" | "saved" | "offline";

const MAX_CONFLICT_RETRIES = 4;

/** Keeps the local kitchen and the account's cloud copy in step. */
export class KitchenSync {
  private revision: number | null = null;
  private base: StorageSchema | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private running: Promise<boolean> | null = null;
  private applying = false;
  status: SyncStatus = "idle";

  constructor(
    private readonly cloud: CloudKitchen,
    private readonly store: SyncedStore,
    private readonly meta: SyncMetaStorage,
    private readonly onStatus: (s: SyncStatus) => void = () => {},
    private readonly debounceMs = 800,
  ) {}

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.onStatus(s);
  }

  private apply(state: StorageSchema) {
    this.applying = true;
    try {
      if (!sameCloudState(state, this.store.data)) this.store.replaceAll({ ...state, consent: this.store.data.consent });
    } finally {
      this.applying = false;
    }
  }

  private remember(base: StorageSchema, revision: number | null) {
    this.base = toCloudState(base);
    this.revision = revision;
    this.meta.save({ revision, base: this.base });
  }

  private parseRemote(data: unknown): StorageSchema {
    const parsed = parseStoredState(data);
    if (!parsed.ok) throw new Error("Cloud kitchen has an unsupported format");
    return parsed.state;
  }

  /** Load the account. Returns false if the cloud couldn't be reached. */
  async start(): Promise<boolean> {
    this.setStatus("syncing");
    const saved = this.meta.load();
    if (saved) {
      this.base = saved.base;
      this.revision = saved.revision;
    }
    this.unsubscribe = this.store.subscribe(() => {
      if (!this.applying) this.schedule();
    });
    try {
      const remote = await this.cloud.pull();
      if (remote) {
        const remoteState = this.parseRemote(remote.data);
        const merged = saved ? threeWayMerge(saved.base, this.store.data, remoteState) : { ...remoteState, consent: this.store.data.consent };
        this.remember(remoteState, remote.revision);
        this.apply(merged);
      } else if (saved && saved.revision !== null) {
        // The cloud row is gone (e.g. deleted elsewhere): start again from this copy.
        this.remember(this.store.data, null);
      }
      return await this.flush();
    } catch {
      this.setStatus("offline");
      return false;
    }
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  /** Save now. Resolves true only when the cloud has the current data. */
  flush(): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.running) return this.running.then(() => this.flush());
    this.running = this.pushLoop().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async pushLoop(): Promise<boolean> {
    try {
      for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
        const current = this.store.data;
        if (this.base && sameCloudState(current, this.base) && this.revision !== null) {
          this.setStatus("saved");
          return true;
        }
        this.setStatus("syncing");
        const payload = toCloudState(current);
        const result = await this.cloud.push(payload, this.revision);
        if (result.saved && result.revision !== null) {
          this.remember(payload, result.revision);
          if (sameCloudState(this.store.data, payload)) {
            this.setStatus("saved");
            return true;
          }
          continue; // edited while saving
        }
        const remote = await this.cloud.pull();
        if (!remote) {
          this.remember(this.store.data, null);
          continue;
        }
        const remoteState = this.parseRemote(remote.data);
        const merged = threeWayMerge(this.base ?? remoteState, this.store.data, remoteState);
        this.remember(remoteState, remote.revision);
        this.apply(merged);
      }
      this.setStatus("offline");
      return false;
    } catch {
      this.setStatus("offline");
      return false;
    }
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
