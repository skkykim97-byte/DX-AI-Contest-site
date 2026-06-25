import { Router } from 'express';
import { ResultService, ResultsNotAvailableError } from '../services/ResultService.js';

const router = Router();
const resultService = new ResultService();

// GET /api/results - 투표 결과 조회 (public, only when state is 'ended')
router.get('/', async (_req, res) => {
  try {
    const results = await resultService.getResults();
    res.json(results);
  } catch (err) {
    if (err instanceof ResultsNotAvailableError) {
      res.status(403).json({
        error: err.message,
        currentStatus: err.currentStatus,
      });
      return;
    }
    res.status(500).json({ error: '결과 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
