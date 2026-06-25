import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { JsonFileStore } from '../store/JsonFileStore.js';
import { normalizeName, validateVote } from '../validators/index.js';
import { StateService } from './StateService.js';
import { SubmissionService } from './SubmissionService.js';
import type { Vote } from '../../src/types/index.js';
import type { Submission } from '../../src/types/index.js';

const DATA_PATH = path.join(process.cwd(), 'data', 'votes.json');

const CATEGORY_KEYS = ['ideaMichiotta', 'planningMaster', 'keepTouching'] as const;

export class VoteService {
  private store: JsonFileStore<Vote>;
  private stateService: StateService;
  private submissionService: SubmissionService;

  constructor(
    store?: JsonFileStore<Vote>,
    stateService?: StateService,
    submissionService?: SubmissionService
  ) {
    this.store = store || new JsonFileStore<Vote>(DATA_PATH);
    this.stateService = stateService || new StateService();
    this.submissionService = submissionService || new SubmissionService();
  }

  /**
   * Submit a vote.
   * Validates: vote data, voting state, duplicate voter, submission existence,
   * and no same participant across categories.
   */
  async submitVote(data: {
    voterName: string;
    selections: {
      ideaMichiotta: string;
      planningMaster: string;
      keepTouching: string;
    };
  }): Promise<Vote> {
    // 1. Validate vote data structure
    const validation = validateVote(data);
    if (!validation.valid) {
      throw new VoteValidationError(validation.error!, validation.missingCategories);
    }

    // 2. Check voting state is 'in_progress'
    const state = await this.stateService.getState();
    if (state.status !== 'in_progress') {
      throw new VoteNotAllowedError(
        state.status === 'not_started'
          ? '투표가 아직 시작되지 않았습니다.'
          : '투표 기간이 종료되었습니다.',
        state.status
      );
    }

    // 3. Normalize voter name and check for duplicates
    const normalizedVoterName = normalizeName(data.voterName);
    const existingVotes = await this.store.readAll();
    const isDuplicate = existingVotes.some(
      (v) => v.normalizedVoterName === normalizedVoterName
    );
    if (isDuplicate) {
      throw new DuplicateVoteError('이미 투표가 완료되었습니다');
    }

    // 4. Validate all selection IDs exist in submissions
    const submissions = await this.submissionService.getAll();
    const submissionMap = new Map<string, Submission>(
      submissions.map((s) => [s.id, s])
    );

    for (const key of CATEGORY_KEYS) {
      const selectionId = data.selections[key];
      if (!submissionMap.has(selectionId)) {
        throw new VoteValidationError(
          `존재하지 않는 제출물 ID입니다: ${selectionId}`
        );
      }
    }

    // 5. Validate no same participant across categories (Req 3.3)
    const selectedParticipants = CATEGORY_KEYS.map((key) => {
      const submission = submissionMap.get(data.selections[key])!;
      return submission.participantName;
    });

    const uniqueParticipants = new Set(selectedParticipants);
    if (uniqueParticipants.size < selectedParticipants.length) {
      throw new VoteValidationError(
        '동일한 참가자를 2개 이상의 카테고리에 선택할 수 없습니다.'
      );
    }

    // 6. Save vote
    const vote: Vote = {
      id: uuidv4(),
      voterName: data.voterName,
      normalizedVoterName,
      selections: data.selections,
      submittedAt: new Date().toISOString(),
    };

    existingVotes.push(vote);
    await this.store.writeAll(existingVotes);

    return vote;
  }

  /**
   * Get list of voters with name and submission time (for Admin).
   */
  async getVoters(): Promise<{ voterName: string; submittedAt: string }[]> {
    const votes = await this.store.readAll();
    return votes.map((v) => ({
      voterName: v.voterName,
      submittedAt: v.submittedAt,
    }));
  }

  /**
   * Get all votes (for result calculation).
   */
  async getAllVotes(): Promise<Vote[]> {
    return this.store.readAll();
  }

  /**
   * Delete all votes. Used by the admin reset feature for repeated testing.
   */
  async clearAllVotes(): Promise<void> {
    await this.store.writeAll([]);
  }
}

export class VoteValidationError extends Error {
  missingCategories?: string[];
  constructor(message: string, missingCategories?: string[]) {
    super(message);
    this.name = 'VoteValidationError';
    this.missingCategories = missingCategories;
  }
}

export class VoteNotAllowedError extends Error {
  currentStatus: string;
  constructor(message: string, currentStatus: string) {
    super(message);
    this.name = 'VoteNotAllowedError';
    this.currentStatus = currentStatus;
  }
}

export class DuplicateVoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateVoteError';
  }
}
