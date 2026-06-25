import { describe, it, expect, beforeEach } from 'vitest';
import { SubmissionService, ValidationError, NotFoundError } from './SubmissionService.js';
import { JsonFileStore } from '../store/JsonFileStore.js';
import type { Submission } from '../../src/types/index.js';
import path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'submission-test-'));
    const store = new JsonFileStore<Submission>(path.join(tempDir, 'submissions.json'));
    service = new SubmissionService(store);
  });

  const validSubmission = {
    participantName: '홍길동',
    type: 'github' as const,
    url: 'https://github.com/user/repo',
    description: '이것은 테스트 제출물의 제작 배경 설명입니다',
  };

  describe('create', () => {
    it('should create a submission with valid data', async () => {
      const result = await service.create(validSubmission);

      expect(result.id).toBeDefined();
      expect(result.participantName).toBe(validSubmission.participantName);
      expect(result.type).toBe(validSubmission.type);
      expect(result.url).toBe(validSubmission.url);
      expect(result.description).toBe(validSubmission.description);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should reject empty participant name', async () => {
      await expect(
        service.create({ ...validSubmission, participantName: '' })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject participant name over 50 chars', async () => {
      await expect(
        service.create({ ...validSubmission, participantName: 'a'.repeat(51) })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject description under 10 chars', async () => {
      await expect(
        service.create({ ...validSubmission, description: '짧은설명' })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject description over 200 chars', async () => {
      await expect(
        service.create({ ...validSubmission, description: 'a'.repeat(201) })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject invalid github URL', async () => {
      await expect(
        service.create({ ...validSubmission, type: 'github', url: 'https://gitlab.com/user/repo' })
      ).rejects.toThrow(ValidationError);
    });

    it('should accept valid html type with URL', async () => {
      const result = await service.create({
        ...validSubmission,
        type: 'html',
        url: '/uploads/some-file.html',
      });
      expect(result.type).toBe('html');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no submissions', async () => {
      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it('should return submissions sorted by createdAt desc', async () => {
      await service.create({ ...validSubmission, participantName: '첫번째' });
      await service.create({ ...validSubmission, participantName: '두번째' });
      await service.create({ ...validSubmission, participantName: '세번째' });

      const result = await service.getAll();
      expect(result.length).toBe(3);
      // Newest first
      expect(result[0].participantName).toBe('세번째');
      expect(result[2].participantName).toBe('첫번째');
    });
  });

  describe('getById', () => {
    it('should return submission by ID', async () => {
      const created = await service.create(validSubmission);
      const found = await service.getById(created.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await service.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update submission fields', async () => {
      const created = await service.create(validSubmission);
      const updated = await service.update(created.id, {
        participantName: '수정된이름',
      });

      expect(updated.participantName).toBe('수정된이름');
      expect(updated.description).toBe(validSubmission.description);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime()
      );
    });

    it('should throw NotFoundError for non-existent ID', async () => {
      await expect(
        service.update('non-existent-id', { participantName: '새이름' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate merged data', async () => {
      const created = await service.create(validSubmission);
      await expect(
        service.update(created.id, { participantName: '' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('delete', () => {
    it('should delete existing submission', async () => {
      const created = await service.create(validSubmission);
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it('should throw NotFoundError for non-existent ID', async () => {
      await expect(service.delete('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCount', () => {
    it('should return 0 when empty', async () => {
      expect(await service.getCount()).toBe(0);
    });

    it('should return correct count after operations', async () => {
      const s1 = await service.create(validSubmission);
      await service.create({ ...validSubmission, participantName: '다른사람' });
      expect(await service.getCount()).toBe(2);

      await service.delete(s1.id);
      expect(await service.getCount()).toBe(1);
    });
  });
});
