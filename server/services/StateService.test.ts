import { describe, it, expect, beforeEach } from 'vitest';
import { StateService, StateTransitionError } from './StateService.js';
import { JsonFileStore } from '../store/JsonFileStore.js';
import type { VotingState } from '../../src/types/index.js';
import path from 'path';
import { randomUUID } from 'crypto';

function createTempStore() {
  const tempPath = path.join(process.cwd(), 'data', `test-state-${randomUUID()}.json`);
  return new JsonFileStore<VotingState>(tempPath);
}

describe('StateService', () => {
  let service: StateService;
  let store: JsonFileStore<VotingState>;

  beforeEach(() => {
    store = createTempStore();
    service = new StateService(store);
  });

  describe('getState', () => {
    it('returns default state when no state has been saved', async () => {
      const state = await service.getState();
      expect(state).toEqual({
        status: 'not_started',
        startedAt: null,
        endedAt: null,
      });
    });

    it('returns saved state', async () => {
      const savedState: VotingState = {
        status: 'in_progress',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: null,
      };
      await store.writeAll([savedState]);

      const state = await service.getState();
      expect(state).toEqual(savedState);
    });
  });

  describe('advance', () => {
    it('transitions from not_started to in_progress', async () => {
      const newState = await service.advance();
      expect(newState.status).toBe('in_progress');
      expect(newState.startedAt).toBeTruthy();
      expect(newState.endedAt).toBeNull();
    });

    it('transitions from in_progress to ended', async () => {
      await service.advance(); // not_started → in_progress
      const newState = await service.advance(); // in_progress → ended
      expect(newState.status).toBe('ended');
      expect(newState.startedAt).toBeTruthy();
      expect(newState.endedAt).toBeTruthy();
    });

    it('throws StateTransitionError when already ended', async () => {
      await service.advance(); // not_started → in_progress
      await service.advance(); // in_progress → ended

      await expect(service.advance()).rejects.toThrow(StateTransitionError);
      await expect(service.advance()).rejects.toMatchObject({
        currentStatus: 'ended',
      });
    });

    it('preserves startedAt when transitioning to ended', async () => {
      const first = await service.advance();
      const second = await service.advance();
      expect(second.startedAt).toBe(first.startedAt);
    });
  });
});
