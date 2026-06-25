import { describe, it, expect, beforeEach } from 'vitest';
import { VoteService, VoteValidationError, VoteNotAllowedError, DuplicateVoteError } from './VoteService.js';
import { StateService } from './StateService.js';
import { SubmissionService } from './SubmissionService.js';
import { JsonFileStore } from '../store/JsonFileStore.js';
import type { Vote, VotingState } from '../../src/types/index.js';
import type { Submission } from '../../src/types/index.js';
import path from 'path';
import { randomUUID } from 'crypto';

function createTempPath(prefix: string) {
  return path.join(process.cwd(), 'data', `test-${prefix}-${randomUUID()}.json`);
}

describe('VoteService', () => {
  let voteService: VoteService;
  let stateStore: JsonFileStore<VotingState>;
  let voteStore: JsonFileStore<Vote>;
  let submissionStore: JsonFileStore<Submission>;
  let stateService: StateService;
  let submissionService: SubmissionService;

  const sampleSubmissions: Submission[] = [
    { id: 'sub1', participantName: '참가자A', type: 'github', url: 'https://github.com/a', description: '설명입니다A 10자이상', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    { id: 'sub2', participantName: '참가자B', type: 'github', url: 'https://github.com/b', description: '설명입니다B 10자이상', createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'sub3', participantName: '참가자C', type: 'github', url: 'https://github.com/c', description: '설명입니다C 10자이상', createdAt: '2024-01-03T00:00:00.000Z', updatedAt: '2024-01-03T00:00:00.000Z' },
  ];

  beforeEach(async () => {
    stateStore = new JsonFileStore<VotingState>(createTempPath('state'));
    voteStore = new JsonFileStore<Vote>(createTempPath('votes'));
    submissionStore = new JsonFileStore<Submission>(createTempPath('subs'));

    stateService = new StateService(stateStore);
    submissionService = new SubmissionService(submissionStore);
    voteService = new VoteService(voteStore, stateService, submissionService);

    // Set state to in_progress
    await stateStore.writeAll([{ status: 'in_progress', startedAt: '2024-01-01T00:00:00.000Z', endedAt: null }]);
    // Add submissions
    await submissionStore.writeAll(sampleSubmissions);
  });

  describe('submitVote', () => {
    const validVote = {
      voterName: '홍길동',
      selections: {
        ideaMichiotta: 'sub1',
        planningMaster: 'sub2',
        keepTouching: 'sub3',
      },
    };

    it('successfully submits a valid vote', async () => {
      const result = await voteService.submitVote(validVote);
      expect(result.id).toBeTruthy();
      expect(result.voterName).toBe('홍길동');
      expect(result.normalizedVoterName).toBe('홍길동');
      expect(result.selections).toEqual(validVote.selections);
      expect(result.submittedAt).toBeTruthy();
    });

    it('rejects vote when state is not_started', async () => {
      await stateStore.writeAll([{ status: 'not_started', startedAt: null, endedAt: null }]);
      await expect(voteService.submitVote(validVote)).rejects.toThrow(VoteNotAllowedError);
    });

    it('rejects vote when state is ended', async () => {
      await stateStore.writeAll([{ status: 'ended', startedAt: '2024-01-01T00:00:00.000Z', endedAt: '2024-01-02T00:00:00.000Z' }]);
      await expect(voteService.submitVote(validVote)).rejects.toThrow(VoteNotAllowedError);
    });

    it('rejects duplicate vote based on normalized name', async () => {
      await voteService.submitVote(validVote);
      // Same name with different spacing
      await expect(
        voteService.submitVote({ ...validVote, voterName: '홍 길 동' })
      ).rejects.toThrow(DuplicateVoteError);
    });

    it('rejects vote with non-existent submission ID', async () => {
      await expect(
        voteService.submitVote({
          voterName: '테스트',
          selections: {
            ideaMichiotta: 'non-existent',
            planningMaster: 'sub2',
            keepTouching: 'sub3',
          },
        })
      ).rejects.toThrow(VoteValidationError);
    });

    it('rejects vote with same participant across categories', async () => {
      // sub1 and sub1 would be same participant - but the validator catches same IDs first.
      // To test participant name check, we need two subs from same participant
      const subsWithDup: Submission[] = [
        ...sampleSubmissions,
        { id: 'sub4', participantName: '참가자A', type: 'html', url: 'http://test.html', description: '참가자A 두번째 제출물', createdAt: '2024-01-04T00:00:00.000Z', updatedAt: '2024-01-04T00:00:00.000Z' },
      ];
      await submissionStore.writeAll(subsWithDup);

      await expect(
        voteService.submitVote({
          voterName: '테스트유저',
          selections: {
            ideaMichiotta: 'sub1',   // 참가자A
            planningMaster: 'sub4',  // 참가자A (duplicate participant)
            keepTouching: 'sub3',
          },
        })
      ).rejects.toThrow(VoteValidationError);
    });

    it('rejects vote with empty voter name', async () => {
      await expect(
        voteService.submitVote({
          voterName: '',
          selections: validVote.selections,
        })
      ).rejects.toThrow(VoteValidationError);
    });

    it('rejects vote with missing category', async () => {
      await expect(
        voteService.submitVote({
          voterName: '테스트',
          selections: {
            ideaMichiotta: 'sub1',
            planningMaster: 'sub2',
            keepTouching: '',
          },
        } as any)
      ).rejects.toThrow(VoteValidationError);
    });
  });

  describe('getVoters', () => {
    it('returns empty list when no votes', async () => {
      const voters = await voteService.getVoters();
      expect(voters).toEqual([]);
    });

    it('returns voter names and times after vote', async () => {
      await voteService.submitVote({
        voterName: '홍길동',
        selections: {
          ideaMichiotta: 'sub1',
          planningMaster: 'sub2',
          keepTouching: 'sub3',
        },
      });

      const voters = await voteService.getVoters();
      expect(voters).toHaveLength(1);
      expect(voters[0].voterName).toBe('홍길동');
      expect(voters[0].submittedAt).toBeTruthy();
    });
  });
});
