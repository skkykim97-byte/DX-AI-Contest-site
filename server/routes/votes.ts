import { Router } from 'express';
import {
  VoteService,
  VoteValidationError,
  VoteNotAllowedError,
  DuplicateVoteError,
} from '../services/VoteService.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();
const voteService = new VoteService();

// POST /api/votes - 투표 제출 (public, validates state is in_progress)
router.post('/', async (req, res) => {
  try {
    const vote = await voteService.submitVote(req.body);
    res.status(201).json(vote);
  } catch (err) {
    if (err instanceof VoteValidationError) {
      res.status(400).json({
        error: err.message,
        missingCategories: err.missingCategories,
      });
      return;
    }
    if (err instanceof VoteNotAllowedError) {
      res.status(403).json({
        error: err.message,
        currentStatus: err.currentStatus,
      });
      return;
    }
    if (err instanceof DuplicateVoteError) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: '투표 처리 중 오류가 발생했습니다.' });
  }
});

// GET /api/votes/voters - 투표 완료자 목록 (Admin only)
router.get('/voters', adminAuth, async (_req, res) => {
  try {
    const voters = await voteService.getVoters();
    res.json(voters);
  } catch (err) {
    res.status(500).json({ error: '투표자 목록 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
