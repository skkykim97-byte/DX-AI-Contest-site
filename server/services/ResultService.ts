import { StateService } from './StateService.js';
import { VoteService } from './VoteService.js';
import { SubmissionService } from './SubmissionService.js';
import type { Vote, VoteResult, CategoryResult } from '../../src/types/index.js';
import type { Submission } from '../../src/types/index.js';

const CATEGORY_KEYS = ['ideaMichiotta', 'planningMaster', 'keepTouching'] as const;

export class ResultService {
  private stateService: StateService;
  private voteService: VoteService;
  private submissionService: SubmissionService;

  constructor(
    stateService?: StateService,
    voteService?: VoteService,
    submissionService?: SubmissionService
  ) {
    this.stateService = stateService || new StateService();
    this.voteService = voteService || new VoteService();
    this.submissionService = submissionService || new SubmissionService();
  }

  /**
   * Calculate results from votes and submissions.
   * Pure calculation logic - can be used independently for testing.
   */
  calculateResults(votes: Vote[], submissions: Submission[]): VoteResult {
    // 투표 제외된 제출물은 결과 집계에서도 제외합니다.
    const votableSubmissions = submissions.filter((s) => !s.excludeFromVoting);
    const submissionMap = new Map<string, Submission>(
      votableSubmissions.map((s) => [s.id, s])
    );

    // Calculate per-category results
    const categories: VoteResult['categories'] = {
      ideaMichiotta: [],
      planningMaster: [],
      keepTouching: [],
    };

    for (const category of CATEGORY_KEYS) {
      // Count votes per submission ID
      const voteCounts = new Map<string, number>();
      for (const vote of votes) {
        const selectionId = vote.selections[category];
        voteCounts.set(selectionId, (voteCounts.get(selectionId) || 0) + 1);
      }

      // Build category results
      const results: CategoryResult[] = [];
      for (const [submissionId, voteCount] of voteCounts) {
        const submission = submissionMap.get(submissionId);
        if (submission) {
          results.push({
            participantName: submission.participantName,
            submissionId,
            voteCount,
            isWinner: false, // Will be set below
          });
        }
      }

      // Also include submissions with 0 votes that are in the system
      for (const submission of votableSubmissions) {
        if (!voteCounts.has(submission.id)) {
          results.push({
            participantName: submission.participantName,
            submissionId: submission.id,
            voteCount: 0,
            isWinner: false,
          });
        }
      }

      // Sort by voteCount descending
      results.sort((a, b) => b.voteCount - a.voteCount);

      // Mark winners (max vote count holders, ties = multiple winners)
      if (results.length > 0 && results[0].voteCount > 0) {
        const maxVoteCount = results[0].voteCount;
        for (const result of results) {
          if (result.voteCount === maxVoteCount) {
            result.isWinner = true;
          }
        }
      }

      categories[category] = results;
    }

    // Calculate overall results (sum of all 3 category votes per participant)
    const overallMap = new Map<string, number>();
    for (const category of CATEGORY_KEYS) {
      for (const result of categories[category]) {
        const current = overallMap.get(result.participantName) || 0;
        overallMap.set(result.participantName, current + result.voteCount);
      }
    }

    const overall: VoteResult['overall'] = [];
    for (const [participantName, totalVoteCount] of overallMap) {
      overall.push({
        participantName,
        totalVoteCount,
        isWinner: false,
      });
    }

    // Sort overall by totalVoteCount descending
    overall.sort((a, b) => b.totalVoteCount - a.totalVoteCount);

    // Mark overall winners (ties = multiple winners)
    if (overall.length > 0 && overall[0].totalVoteCount > 0) {
      const maxTotal = overall[0].totalVoteCount;
      for (const entry of overall) {
        if (entry.totalVoteCount === maxTotal) {
          entry.isWinner = true;
        }
      }
    }

    return { categories, overall };
  }

  /**
   * Get results. Only available when voting state is 'ended'.
   */
  async getResults(): Promise<VoteResult> {
    const state = await this.stateService.getState();
    if (state.status !== 'ended') {
      throw new ResultsNotAvailableError(
        '투표가 종료된 후에만 결과를 확인할 수 있습니다.',
        state.status
      );
    }

    const votes = await this.voteService.getAllVotes();
    const submissions = await this.submissionService.getAll();

    return this.calculateResults(votes, submissions);
  }
}

export class ResultsNotAvailableError extends Error {
  currentStatus: string;
  constructor(message: string, currentStatus: string) {
    super(message);
    this.name = 'ResultsNotAvailableError';
    this.currentStatus = currentStatus;
  }
}
