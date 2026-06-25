import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { JsonFileStore } from '../store/JsonFileStore.js';
import { validateSubmission, validateGitHubUrl } from '../validators/index.js';
import type { Submission } from '../../src/types/index.js';

const DATA_PATH = path.join(process.cwd(), 'data', 'submissions.json');

export class SubmissionService {
  private store: JsonFileStore<Submission>;

  constructor(store?: JsonFileStore<Submission>) {
    this.store = store || new JsonFileStore<Submission>(DATA_PATH);
  }

  /**
   * Create a new submission.
   * For 'html' type, the URL should be set after file upload.
   * For 'github' type, validates the URL.
   */
  async create(data: {
    participantName: string;
    type: 'html' | 'github';
    url: string;
    description: string;
  }): Promise<Submission> {
    const validation = validateSubmission(data);
    if (!validation.valid) {
      throw new ValidationError(validation.error!, validation.field);
    }

    const now = new Date().toISOString();
    const submission: Submission = {
      id: uuidv4(),
      participantName: data.participantName,
      type: data.type,
      url: data.url,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };

    const all = await this.store.readAll();
    all.push(submission);
    await this.store.writeAll(all);

    return submission;
  }

  /**
   * Get all submissions sorted by createdAt descending (newest first).
   */
  async getAll(): Promise<Submission[]> {
    const all = await this.store.readAll();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get a single submission by ID.
   */
  async getById(id: string): Promise<Submission | null> {
    const all = await this.store.readAll();
    return all.find((s) => s.id === id) || null;
  }

  /**
   * Update an existing submission.
   */
  async update(
    id: string,
    data: Partial<{
      participantName: string;
      type: 'html' | 'github';
      url: string;
      description: string;
    }>
  ): Promise<Submission> {
    const all = await this.store.readAll();
    const index = all.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundError('제출물을 찾을 수 없습니다');
    }

    const existing = all[index];
    const merged = {
      participantName: data.participantName ?? existing.participantName,
      type: data.type ?? existing.type,
      url: data.url ?? existing.url,
      description: data.description ?? existing.description,
    };

    // Validate the merged data
    const validation = validateSubmission(merged);
    if (!validation.valid) {
      throw new ValidationError(validation.error!, validation.field);
    }

    const updated: Submission = {
      ...existing,
      ...merged,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    await this.store.writeAll(all);

    return updated;
  }

  /**
   * Delete a submission by ID.
   */
  async delete(id: string): Promise<void> {
    const all = await this.store.readAll();
    const index = all.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundError('제출물을 찾을 수 없습니다');
    }

    all.splice(index, 1);
    await this.store.writeAll(all);
  }

  /**
   * Get total count of submissions.
   */
  async getCount(): Promise<number> {
    const all = await this.store.readAll();
    return all.length;
  }
}

export class ValidationError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
