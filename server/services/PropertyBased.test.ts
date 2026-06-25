import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import path from 'path';
import { randomUUID } from 'crypto';
import { StateService, StateTransitionError } from './StateService.js';
import { ResultService } from './ResultService.js';
import { JsonFileStore } from '../store/JsonFileStore.js';
import { normalizeName } from '../validators/index.js';
import type { VotingState, Vote, Submission } from '../../src/types/index.js';

// Helper: create a temp store for StateService tests
function createTempStore() {
  const tempPath = path.join(process.cwd(), 'data', `test-pbt-state-${randomUUID()}.json`);
  return new JsonFileStore<VotingState>(tempPath);
}

// Helper: generate a valid Submission arbitrary
function submissionArb(id: string): fc.Arbitrary<Submission> {
  return fc.record({
    id: fc.constant(id),
    participantName: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    type: fc.constantFrom('html' as const, 'github' as const),
    url: fc.constant('https://example.com'),
    description: fc.string({ minLength: 10, maxLength: 50 }),
    createdAt: fc.constant(new Date().toISOString()),
    updatedAt: fc.constant(new Date().toISOString()),
  });
}

// Helper: generate a list of unique submissions
function submissionsArb(count: number): fc.Arbitrary<Submission[]> {
  return fc.tuple(
    ...Array.from({ length: count }, (_, i) => submissionArb(`sub-${i}`))
  ) as unknown as fc.Arbitrary<Submission[]>;
}

// Helper: generate votes that reference valid submission IDs
function votesArb(submissionIds: string[], numVotes: number): fc.Arbitrary<Vote[]> {
  if (submissionIds.length < 3) {
    // Need at least 3 submissions for 3 categories
    return fc.constant([]);
  }
  const voteArb = fc.record({
    id: fc.uuid(),
    voterName: fc.string({ minLength: 1, maxLength: 20 }),
    normalizedVoterName: fc.string({ minLength: 1, maxLength: 20 }),
    selections: fc.record({
      ideaMichiotta: fc.constantFrom(...submissionIds),
      planningMaster: fc.constantFrom(...submissionIds),
      keepTouching: fc.constantFrom(...submissionIds),
    }),
    submittedAt: fc.constant(new Date().toISOString()),
  });
  return fc.array(voteArb, { minLength: numVotes, maxLength: numVotes });
}

/**
 * Feature: ai-vibe-coding-contest, Property 9: 투표 상태 전환 단방향성
 * Validates: Requirements 3.6, 4.6
 */
describe('Feature: ai-vibe-coding-contest, Property 9: 투표 상태 전환 단방향성', () => {
  it('상태는 오직 not_started → in_progress → ended 순서로만 전환된다', async () => {
    await fc.assert(
      fc.asyncProperty(fc.nat({ max: 10 }), async (advanceAttempts) => {
        const store = createTempStore();
        const service = new StateService(store);

        const transitions: string[] = [];
        let currentStatus = 'not_started';

        for (let i = 0; i < advanceAttempts; i++) {
          try {
            const newState = await service.advance();
            transitions.push(`${currentStatus} → ${newState.status}`);
            currentStatus = newState.status;
          } catch (err) {
            // Should only throw when already ended
            expect(err).toBeInstanceOf(StateTransitionError);
            expect(currentStatus).toBe('ended');
          }
        }

        // Verify the state never goes backwards or skips
        const validOrder = ['not_started', 'in_progress', 'ended'];
        const finalState = await service.getState();
        const finalIndex = validOrder.indexOf(finalState.status);
        expect(finalIndex).toBeGreaterThanOrEqual(0);

        // The number of successful transitions should equal the index
        const successfulTransitions = transitions.length;
        expect(successfulTransitions).toBe(finalIndex);
      }),
      { numRuns: 100 }
    );
  });

  it('ended 상태에서 advance()는 항상 StateTransitionError를 던진다', async () => {
    await fc.assert(
      fc.asyncProperty(fc.nat({ max: 5 }), async (extraAttempts) => {
        const store = createTempStore();
        const service = new StateService(store);

        // Advance to ended state
        await service.advance(); // not_started → in_progress
        await service.advance(); // in_progress → ended

        // All subsequent advance attempts must throw
        for (let i = 0; i < extraAttempts; i++) {
          try {
            await service.advance();
            // Should not reach here
            expect.fail('advance() should have thrown StateTransitionError');
          } catch (err) {
            expect(err).toBeInstanceOf(StateTransitionError);
            expect((err as StateTransitionError).currentStatus).toBe('ended');
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-vibe-coding-contest, Property 10: 투표 집계 정확성
 * Validates: Requirements 5.1, 5.2
 */
describe('Feature: ai-vibe-coding-contest, Property 10: 투표 집계 정확성', () => {
  const resultService = new ResultService();

  it('각 카테고리별 참가자의 득표 수는 해당 참가자를 선택한 투표 수와 정확히 일치한다', () => {
    const numSubmissions = 5;

    fc.assert(
      fc.property(
        submissionsArb(numSubmissions).chain((submissions) => {
          const ids = submissions.map(s => s.id);
          return fc.tuple(
            fc.constant(submissions),
            fc.array(
              fc.record({
                id: fc.uuid(),
                voterName: fc.string({ minLength: 1, maxLength: 20 }),
                normalizedVoterName: fc.string({ minLength: 1, maxLength: 20 }),
                selections: fc.record({
                  ideaMichiotta: fc.constantFrom(...ids),
                  planningMaster: fc.constantFrom(...ids),
                  keepTouching: fc.constantFrom(...ids),
                }),
                submittedAt: fc.constant(new Date().toISOString()),
              }),
              { minLength: 1, maxLength: 20 }
            )
          );
        }),
        ([submissions, votes]) => {
          const result = resultService.calculateResults(votes, submissions);

          const categories = ['ideaMichiotta', 'planningMaster', 'keepTouching'] as const;

          for (const category of categories) {
            // Manually count votes per submission
            const expectedCounts = new Map<string, number>();
            for (const vote of votes) {
              const selId = vote.selections[category];
              expectedCounts.set(selId, (expectedCounts.get(selId) || 0) + 1);
            }

            // Verify result matches expected counts
            for (const catResult of result.categories[category]) {
              const expected = expectedCounts.get(catResult.submissionId) || 0;
              expect(catResult.voteCount).toBe(expected);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('종합 득표 수는 3개 카테고리 득표 수의 합과 일치한다', () => {
    const numSubmissions = 4;

    fc.assert(
      fc.property(
        submissionsArb(numSubmissions).chain((submissions) => {
          const ids = submissions.map(s => s.id);
          return fc.tuple(
            fc.constant(submissions),
            fc.array(
              fc.record({
                id: fc.uuid(),
                voterName: fc.string({ minLength: 1, maxLength: 20 }),
                normalizedVoterName: fc.string({ minLength: 1, maxLength: 20 }),
                selections: fc.record({
                  ideaMichiotta: fc.constantFrom(...ids),
                  planningMaster: fc.constantFrom(...ids),
                  keepTouching: fc.constantFrom(...ids),
                }),
                submittedAt: fc.constant(new Date().toISOString()),
              }),
              { minLength: 1, maxLength: 20 }
            )
          );
        }),
        ([submissions, votes]) => {
          const result = resultService.calculateResults(votes, submissions);

          const categories = ['ideaMichiotta', 'planningMaster', 'keepTouching'] as const;

          // For each participant in overall, verify total is sum of category counts
          for (const overallEntry of result.overall) {
            let sumFromCategories = 0;
            for (const category of categories) {
              const catEntry = result.categories[category].find(
                (r) => r.participantName === overallEntry.participantName
              );
              if (catEntry) {
                sumFromCategories += catEntry.voteCount;
              }
            }
            expect(overallEntry.totalVoteCount).toBe(sumFromCategories);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-vibe-coding-contest, Property 11: 우승자 결정 및 동점 처리
 * Validates: Requirements 5.1, 5.2, 5.3
 */
describe('Feature: ai-vibe-coding-contest, Property 11: 우승자 결정 및 동점 처리', () => {
  const resultService = new ResultService();

  it('우승자의 득표 수는 해당 카테고리의 최대값이며, 최대 득표수를 가진 모든 참가자가 우승자로 표시된다', () => {
    const numSubmissions = 4;

    fc.assert(
      fc.property(
        submissionsArb(numSubmissions).chain((submissions) => {
          const ids = submissions.map(s => s.id);
          return fc.tuple(
            fc.constant(submissions),
            fc.array(
              fc.record({
                id: fc.uuid(),
                voterName: fc.string({ minLength: 1, maxLength: 20 }),
                normalizedVoterName: fc.string({ minLength: 1, maxLength: 20 }),
                selections: fc.record({
                  ideaMichiotta: fc.constantFrom(...ids),
                  planningMaster: fc.constantFrom(...ids),
                  keepTouching: fc.constantFrom(...ids),
                }),
                submittedAt: fc.constant(new Date().toISOString()),
              }),
              { minLength: 1, maxLength: 20 }
            )
          );
        }),
        ([submissions, votes]) => {
          const result = resultService.calculateResults(votes, submissions);

          const categories = ['ideaMichiotta', 'planningMaster', 'keepTouching'] as const;

          for (const category of categories) {
            const catResults = result.categories[category];
            if (catResults.length === 0) continue;

            const maxVoteCount = Math.max(...catResults.map(r => r.voteCount));

            if (maxVoteCount === 0) {
              // No votes => no winners
              expect(catResults.every(r => !r.isWinner)).toBe(true);
            } else {
              // All with max vote count must be winners
              for (const r of catResults) {
                if (r.voteCount === maxVoteCount) {
                  expect(r.isWinner).toBe(true);
                } else {
                  expect(r.isWinner).toBe(false);
                }
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('종합 우승자도 최대 득표수를 가진 모든 참가자가 빠짐없이 표시된다', () => {
    const numSubmissions = 4;

    fc.assert(
      fc.property(
        submissionsArb(numSubmissions).chain((submissions) => {
          const ids = submissions.map(s => s.id);
          return fc.tuple(
            fc.constant(submissions),
            fc.array(
              fc.record({
                id: fc.uuid(),
                voterName: fc.string({ minLength: 1, maxLength: 20 }),
                normalizedVoterName: fc.string({ minLength: 1, maxLength: 20 }),
                selections: fc.record({
                  ideaMichiotta: fc.constantFrom(...ids),
                  planningMaster: fc.constantFrom(...ids),
                  keepTouching: fc.constantFrom(...ids),
                }),
                submittedAt: fc.constant(new Date().toISOString()),
              }),
              { minLength: 1, maxLength: 20 }
            )
          );
        }),
        ([submissions, votes]) => {
          const result = resultService.calculateResults(votes, submissions);

          const overall = result.overall;
          if (overall.length === 0) return;

          const maxTotal = Math.max(...overall.map(o => o.totalVoteCount));

          if (maxTotal === 0) {
            // No votes => no winners
            expect(overall.every(o => !o.isWinner)).toBe(true);
          } else {
            for (const entry of overall) {
              if (entry.totalVoteCount === maxTotal) {
                expect(entry.isWinner).toBe(true);
              } else {
                expect(entry.isWinner).toBe(false);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-vibe-coding-contest, Property 14: 이름 정규화 및 중복 투표 탐지
 * Validates: Requirements 6.1, 6.2
 */
describe('Feature: ai-vibe-coding-contest, Property 14: 이름 정규화 및 중복 투표 탐지', () => {
  it('동일한 기본 문자 조합의 모든 변형에 대해 동일한 정규화 결과를 생성한다', () => {
    // Arbitrary that generates a base string and then creates whitespace/case variations
    const baseCharsArb = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.replace(/\s/g, '').length > 0);

    fc.assert(
      fc.property(baseCharsArb, (baseStr) => {
        // Get the "canonical" form: no whitespace, all lowercase
        const canonical = baseStr.replace(/\s+/g, '').toLowerCase();

        // normalizeName should produce the canonical form
        const normalized = normalizeName(baseStr);
        expect(normalized).toBe(canonical);
      }),
      { numRuns: 100 }
    );
  });

  it('앞뒤 공백이 있는 이름과 없는 이름은 동일하게 정규화된다', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.replace(/\s/g, '').length > 0),
        fc.string({ minLength: 0, maxLength: 5 }).map(s => s.replace(/\S/g, ' ')),
        fc.string({ minLength: 0, maxLength: 5 }).map(s => s.replace(/\S/g, ' ')),
        (name, leadingSpaces, trailingSpaces) => {
          const withSpaces = leadingSpaces + name + trailingSpaces;
          expect(normalizeName(withSpaces)).toBe(normalizeName(name));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('대소문자가 다른 이름에 대해 동일한 정규화 결과를 생성한다', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.replace(/\s/g, '').length > 0),
        (name) => {
          const upper = name.toUpperCase();
          const lower = name.toLowerCase();
          const mixed = name.split('').map((c, i) =>
            i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
          ).join('');

          const normalizedOriginal = normalizeName(name);
          expect(normalizeName(upper)).toBe(normalizedOriginal);
          expect(normalizeName(lower)).toBe(normalizedOriginal);
          expect(normalizeName(mixed)).toBe(normalizedOriginal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('내부 공백이 제거된다', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.replace(/\s/g, '').length > 0), { minLength: 2, maxLength: 5 }),
        (parts) => {
          // Join with various whitespace
          const withSpaces = parts.join('  ');
          const withoutSpaces = parts.join('');
          expect(normalizeName(withSpaces)).toBe(normalizeName(withoutSpaces));
        }
      ),
      { numRuns: 100 }
    );
  });
});
