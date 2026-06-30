// Shared type definitions - will be expanded in task 1.2
export interface Submission {
  id: string;
  participantName: string;
  type: 'html' | 'github';
  url: string;
  description: string;
  /** true면 아카이빙에는 표시되지만 투표 대상에서는 제외됩니다. */
  excludeFromVoting?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  voterName: string;
  normalizedVoterName: string;
  selections: {
    ideaMichiotta: string;
    planningMaster: string;
    keepTouching: string;
  };
  submittedAt: string;
}

export interface VotingState {
  status: 'not_started' | 'in_progress' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
}

export interface CategoryResult {
  participantName: string;
  submissionId: string;
  voteCount: number;
  isWinner: boolean;
}

export interface VoteResult {
  categories: {
    ideaMichiotta: CategoryResult[];
    planningMaster: CategoryResult[];
    keepTouching: CategoryResult[];
  };
  overall: {
    participantName: string;
    totalVoteCount: number;
    isWinner: boolean;
  }[];
}
