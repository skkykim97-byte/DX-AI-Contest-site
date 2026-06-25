import { describe, it, expect } from 'vitest';
import { ResultService } from './ResultService.js';
import type { Vote } from '../../src/types/index.js';
import type { Submission } from '../../src/types/index.js';

describe('ResultService', () => {
  describe('calculateResults', () => {
    const submissions: Submission[] = [
      { id: 'sub1', participantName: '참가자A', type: 'github', url: 'https://github.com/a', description: '설명입니다A 10자이상', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'sub2', participantName: '참가자B', type: 'github', url: 'https://github.com/b', description: '설명입니다B 10자이상', createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
      { id: 'sub3', participantName: '참가자C', type: 'github', url: 'https://github.com/c', description: '설명입니다C 10자이상', createdAt: '2024-01-03T00:00:00.000Z', updatedAt: '2024-01-03T00:00:00.000Z' },
    ];

    const service = new ResultService();

    it('calculates vote counts correctly', () => {
      const votes: Vote[] = [
        { id: 'v1', voterName: '유저1', normalizedVoterName: '유저1', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub2', keepTouching: 'sub3' }, submittedAt: '2024-01-10T00:00:00.000Z' },
        { id: 'v2', voterName: '유저2', normalizedVoterName: '유저2', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub3', keepTouching: 'sub2' }, submittedAt: '2024-01-10T01:00:00.000Z' },
        { id: 'v3', voterName: '유저3', normalizedVoterName: '유저3', selections: { ideaMichiotta: 'sub2', planningMaster: 'sub3', keepTouching: 'sub1' }, submittedAt: '2024-01-10T02:00:00.000Z' },
      ];

      const result = service.calculateResults(votes, submissions);

      // ideaMichiotta: sub1=2, sub2=1, sub3=0
      const ideaResults = result.categories.ideaMichiotta;
      expect(ideaResults[0].submissionId).toBe('sub1');
      expect(ideaResults[0].voteCount).toBe(2);
      expect(ideaResults[0].isWinner).toBe(true);
      expect(ideaResults[1].voteCount).toBe(1);
      expect(ideaResults[1].isWinner).toBe(false);
    });

    it('handles ties - multiple winners', () => {
      const votes: Vote[] = [
        { id: 'v1', voterName: '유저1', normalizedVoterName: '유저1', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub2', keepTouching: 'sub3' }, submittedAt: '2024-01-10T00:00:00.000Z' },
        { id: 'v2', voterName: '유저2', normalizedVoterName: '유저2', selections: { ideaMichiotta: 'sub2', planningMaster: 'sub1', keepTouching: 'sub3' }, submittedAt: '2024-01-10T01:00:00.000Z' },
      ];

      const result = service.calculateResults(votes, submissions);

      // ideaMichiotta: sub1=1, sub2=1 → both winners
      const ideaWinners = result.categories.ideaMichiotta.filter((r) => r.isWinner);
      expect(ideaWinners).toHaveLength(2);
      expect(ideaWinners[0].voteCount).toBe(1);
      expect(ideaWinners[1].voteCount).toBe(1);
    });

    it('sorts results by voteCount descending', () => {
      const votes: Vote[] = [
        { id: 'v1', voterName: '유저1', normalizedVoterName: '유저1', selections: { ideaMichiotta: 'sub3', planningMaster: 'sub1', keepTouching: 'sub2' }, submittedAt: '2024-01-10T00:00:00.000Z' },
        { id: 'v2', voterName: '유저2', normalizedVoterName: '유저2', selections: { ideaMichiotta: 'sub3', planningMaster: 'sub2', keepTouching: 'sub1' }, submittedAt: '2024-01-10T01:00:00.000Z' },
        { id: 'v3', voterName: '유저3', normalizedVoterName: '유저3', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub2', keepTouching: 'sub3' }, submittedAt: '2024-01-10T02:00:00.000Z' },
      ];

      const result = service.calculateResults(votes, submissions);

      // ideaMichiotta: sub3=2, sub1=1, sub2=0
      const ideaResults = result.categories.ideaMichiotta;
      for (let i = 0; i < ideaResults.length - 1; i++) {
        expect(ideaResults[i].voteCount).toBeGreaterThanOrEqual(ideaResults[i + 1].voteCount);
      }
    });

    it('calculates overall totals correctly', () => {
      const votes: Vote[] = [
        { id: 'v1', voterName: '유저1', normalizedVoterName: '유저1', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub2', keepTouching: 'sub3' }, submittedAt: '2024-01-10T00:00:00.000Z' },
        { id: 'v2', voterName: '유저2', normalizedVoterName: '유저2', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub1', keepTouching: 'sub3' }, submittedAt: '2024-01-10T01:00:00.000Z' },
      ];

      const result = service.calculateResults(votes, submissions);

      // 참가자A (sub1): idea=2 + planning=1 + keep=0 = 3
      // 참가자B (sub2): idea=0 + planning=1 + keep=0 = 1
      // 참가자C (sub3): idea=0 + planning=0 + keep=2 = 2
      const overallA = result.overall.find((o) => o.participantName === '참가자A');
      expect(overallA?.totalVoteCount).toBe(3);
      expect(overallA?.isWinner).toBe(true);

      const overallC = result.overall.find((o) => o.participantName === '참가자C');
      expect(overallC?.totalVoteCount).toBe(2);
    });

    it('returns empty results with no votes', () => {
      const result = service.calculateResults([], submissions);

      // All results should have voteCount 0
      for (const category of ['ideaMichiotta', 'planningMaster', 'keepTouching'] as const) {
        for (const r of result.categories[category]) {
          expect(r.voteCount).toBe(0);
          expect(r.isWinner).toBe(false);
        }
      }
      for (const o of result.overall) {
        expect(o.totalVoteCount).toBe(0);
        expect(o.isWinner).toBe(false);
      }
    });

    it('overall is sorted descending by totalVoteCount', () => {
      const votes: Vote[] = [
        { id: 'v1', voterName: '유저1', normalizedVoterName: '유저1', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub2', keepTouching: 'sub3' }, submittedAt: '2024-01-10T00:00:00.000Z' },
        { id: 'v2', voterName: '유저2', normalizedVoterName: '유저2', selections: { ideaMichiotta: 'sub2', planningMaster: 'sub3', keepTouching: 'sub1' }, submittedAt: '2024-01-10T01:00:00.000Z' },
        { id: 'v3', voterName: '유저3', normalizedVoterName: '유저3', selections: { ideaMichiotta: 'sub1', planningMaster: 'sub3', keepTouching: 'sub2' }, submittedAt: '2024-01-10T02:00:00.000Z' },
      ];

      const result = service.calculateResults(votes, submissions);

      for (let i = 0; i < result.overall.length - 1; i++) {
        expect(result.overall[i].totalVoteCount).toBeGreaterThanOrEqual(
          result.overall[i + 1].totalVoteCount
        );
      }
    });
  });
});
