import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { dirname, join, basename } from 'path';

/**
 * Generic durable store for an array of items of type T.
 *
 * Two backends are supported, chosen automatically:
 *
 *  1. **Upstash Redis (durable)** — used when the environment variables
 *     `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.
 *     This keeps data persistent across server restarts / redeploys, which is
 *     required on ephemeral hosting (e.g. Render free tier) where the local
 *     filesystem is wiped on restart.
 *
 *  2. **Local JSON file (fallback)** — used when no Redis config is present
 *     (e.g. local development). Writes atomically via a temp file + rename and
 *     serializes writes with an in-memory mutex.
 *
 * The Redis key is derived from the file name (e.g. "submissions.json"), so
 * each logical collection maps to its own key.
 */
export class JsonFileStore<T> {
  private filePath: string;
  private redisKey: string;
  private lockPromise: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
    this.redisKey = basename(filePath); // e.g. "submissions.json"
  }

  private get redisUrl(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_URL;
  }

  private get redisToken(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_TOKEN;
  }

  private get useRedis(): boolean {
    return Boolean(this.redisUrl && this.redisToken);
  }

  /**
   * Read all items. Returns an empty array if nothing has been stored yet.
   * If Redis is configured but fails, logs the error and falls back to the
   * local file so the app keeps working instead of returning a 500.
   */
  async readAll(): Promise<T[]> {
    if (this.useRedis) {
      try {
        return await this.redisReadAll();
      } catch (err) {
        console.error(
          `[JsonFileStore] Redis read failed for "${this.redisKey}", falling back to file. ` +
            `Check UPSTASH_REDIS_REST_URL (must start with https://) and UPSTASH_REDIS_REST_TOKEN. Error:`,
          err instanceof Error ? err.message : err
        );
      }
    }
    return this.fileReadAll();
  }

  /**
   * Write all items, replacing the existing collection.
   * If Redis is configured but fails, logs the error and falls back to the
   * local file so writes don't hard-fail with a 500.
   */
  async writeAll(data: T[]): Promise<void> {
    if (this.useRedis) {
      try {
        await this.redisWriteAll(data);
        return;
      } catch (err) {
        console.error(
          `[JsonFileStore] Redis write failed for "${this.redisKey}", falling back to file. ` +
            `Check UPSTASH_REDIS_REST_URL (must start with https://) and UPSTASH_REDIS_REST_TOKEN. Error:`,
          err instanceof Error ? err.message : err
        );
      }
    }
    return this.fileWriteAll(data);
  }

  // ---------------------------------------------------------------------------
  // Redis backend (Upstash REST)
  // ---------------------------------------------------------------------------

  private async redisCommand(command: unknown[]): Promise<{ result: unknown }> {
    // Use the global fetch available in Node 18+ (Render runs Node 20).
    const fetchFn = (globalThis as { fetch?: typeof fetch }).fetch;
    if (!fetchFn) {
      throw new Error('fetch is not available in this runtime');
    }
    const url = (this.redisUrl ?? '').trim();
    const token = (this.redisToken ?? '').trim();
    if (!/^https:\/\//i.test(url)) {
      throw new Error(
        `UPSTASH_REDIS_REST_URL must be the HTTPS REST URL (https://...), got: "${url.slice(0, 12)}..."`
      );
    }
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upstash Redis error ${res.status}: ${text}`);
    }
    return (await res.json()) as { result: unknown };
  }

  private async redisReadAll(): Promise<T[]> {
    const { result } = await this.redisCommand(['GET', this.redisKey]);
    if (result == null) {
      return [];
    }
    try {
      return JSON.parse(String(result)) as T[];
    } catch {
      return [];
    }
  }

  private async redisWriteAll(data: T[]): Promise<void> {
    await this.redisCommand(['SET', this.redisKey, JSON.stringify(data)]);
  }

  // ---------------------------------------------------------------------------
  // File backend (local fallback)
  // ---------------------------------------------------------------------------

  /**
   * Acquire the in-memory mutex lock. Returns a release function.
   */
  private acquireLock(): Promise<() => void> {
    let release: () => void;
    const newLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const waitForPrevious = this.lockPromise;
    this.lockPromise = this.lockPromise.then(() => newLock);
    return waitForPrevious.then(() => release!);
  }

  private async fileReadAll(): Promise<T[]> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as T[];
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return [];
      }
      throw err;
    }
  }

  private async fileWriteAll(data: T[]): Promise<void> {
    const release = await this.acquireLock();
    try {
      const dir = dirname(this.filePath);
      await mkdir(dir, { recursive: true });

      const tempPath = join(dir, `.${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`);
      const content = JSON.stringify(data, null, 2);

      await writeFile(tempPath, content, 'utf-8');
      await rename(tempPath, this.filePath);
    } finally {
      release();
    }
  }
}
