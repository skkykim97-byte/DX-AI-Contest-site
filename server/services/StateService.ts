import path from 'path';
import { JsonFileStore } from '../store/JsonFileStore.js';
import type { VotingState } from '../../src/types/index.js';

const DATA_PATH = path.join(process.cwd(), 'data', 'state.json');

const DEFAULT_STATE: VotingState = {
  status: 'not_started',
  startedAt: null,
  endedAt: null,
};

export class StateService {
  private store: JsonFileStore<VotingState>;

  constructor(store?: JsonFileStore<VotingState>) {
    this.store = store || new JsonFileStore<VotingState>(DATA_PATH);
  }

  /**
   * Get the current voting state.
   * Returns default state if no state has been saved yet.
   */
  async getState(): Promise<VotingState> {
    const all = await this.store.readAll();
    if (all.length === 0) {
      return { ...DEFAULT_STATE };
    }
    return all[0];
  }

  /**
   * Advance the voting state forward.
   * Allowed transitions: not_started → in_progress → ended
   * Returns the new state on success.
   * Throws StateTransitionError on invalid transitions.
   */
  async advance(): Promise<VotingState> {
    const current = await this.getState();

    let newState: VotingState;

    switch (current.status) {
      case 'not_started':
        newState = {
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          endedAt: null,
        };
        break;
      case 'in_progress':
        newState = {
          status: 'ended',
          startedAt: current.startedAt,
          endedAt: new Date().toISOString(),
        };
        break;
      case 'ended':
        throw new StateTransitionError(
          '투표가 이미 종료되었습니다. 이전 상태로 되돌릴 수 없습니다.',
          current.status
        );
      default:
        throw new StateTransitionError('잘못된 상태입니다.', current.status);
    }

    await this.store.writeAll([newState]);
    return newState;
  }
}

export class StateTransitionError extends Error {
  currentStatus: string;
  constructor(message: string, currentStatus: string) {
    super(message);
    this.name = 'StateTransitionError';
    this.currentStatus = currentStatus;
  }
}
