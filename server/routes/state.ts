import { Router } from 'express';
import { StateService, StateTransitionError } from '../services/StateService.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();
const stateService = new StateService();

// GET /api/state - 현재 투표 상태 조회 (public)
router.get('/', async (_req, res) => {
  try {
    const state = await stateService.getState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: '상태 조회 중 오류가 발생했습니다.' });
  }
});

// PUT /api/state/advance - 투표 상태 전진 (Admin only)
router.put('/advance', adminAuth, async (_req, res) => {
  try {
    const newState = await stateService.advance();
    res.json(newState);
  } catch (err) {
    if (err instanceof StateTransitionError) {
      res.status(400).json({
        error: err.message,
        currentStatus: err.currentStatus,
      });
      return;
    }
    res.status(500).json({ error: '상태 변경 중 오류가 발생했습니다.' });
  }
});

export default router;
