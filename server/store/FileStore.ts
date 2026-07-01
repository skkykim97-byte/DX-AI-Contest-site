import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Stores uploaded HTML file *contents* durably.
 *
 * - When Upstash Redis is configured (UPSTASH_REDIS_REST_URL / _TOKEN), the
 *   file content is stored in Redis under the key `upload:<filename>`. This
 *   keeps uploaded HTML files persistent across restarts/redeploys on
 *   ephemeral hosting (Render free tier wipes the local disk).
 * - Otherwise, files are written to / read from the local `uploads/` dir.
 */
export class FileStore {
  private uploadsDir = path.join(process.cwd(), 'uploads');

  private get redisUrl(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_URL?.trim();
  }
  private get redisToken(): string | undefined {
    return process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  }
  private get useRedis(): boolean {
    return Boolean(this.redisUrl && this.redisToken);
  }

  private async redisCommand(command: unknown[]): Promise<{ result: unknown }> {
    const fetchFn = (globalThis as { fetch?: typeof fetch }).fetch;
    if (!fetchFn) throw new Error('fetch is not available in this runtime');
    const url = this.redisUrl ?? '';
    if (!/^https:\/\//i.test(url)) {
      throw new Error('UPSTASH_REDIS_REST_URL must be the HTTPS REST URL');
    }
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.redisToken}`,
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

  private key(filename: string): string {
    return `upload:${filename}`;
  }

  /** Store an uploaded HTML file's content. */
  async putFile(filename: string, content: Buffer | string): Promise<void> {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    if (this.useRedis) {
      await this.redisCommand(['SET', this.key(filename), text]);
      return;
    }
    await mkdir(this.uploadsDir, { recursive: true });
    await writeFile(path.join(this.uploadsDir, filename), text, 'utf-8');
  }

  /** Retrieve an uploaded HTML file's content, or null if not found. */
  async getFile(filename: string): Promise<string | null> {
    if (this.useRedis) {
      const { result } = await this.redisCommand(['GET', this.key(filename)]);
      return result == null ? null : String(result);
    }
    try {
      return await readFile(path.join(this.uploadsDir, filename), 'utf-8');
    } catch {
      return null;
    }
  }
}
