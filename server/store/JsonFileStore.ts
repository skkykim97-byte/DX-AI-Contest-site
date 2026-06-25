import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

/**
 * Generic JSON file-based store with atomic writes and in-memory mutex.
 * Stores an array of items of type T in a JSON file.
 */
export class JsonFileStore<T> {
  private filePath: string;
  private lockPromise: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Acquire the in-memory mutex lock.
   * Returns a release function to call when done.
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

  /**
   * Read all items from the JSON file.
   * Returns empty array if file does not exist.
   */
  async readAll(): Promise<T[]> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as T[];
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  /**
   * Write all items to the JSON file atomically.
   * Writes to a temp file first, then renames to target path.
   * Uses in-memory mutex to prevent concurrent writes.
   */
  async writeAll(data: T[]): Promise<void> {
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
