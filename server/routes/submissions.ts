import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { adminAuth } from '../middleware/adminAuth.js';
import { SubmissionService, ValidationError, NotFoundError } from '../services/SubmissionService.js';

const router = Router();
const submissionService = new SubmissionService();

// Configure multer for HTML file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (_req, _file, cb) => {
    const uuid = uuidv4();
    cb(null, `${uuid}.html`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.html') {
      cb(new Error('.html 파일만 업로드 가능합니다'));
      return;
    }
    cb(null, true);
  },
});

const uploadSingle = upload.single('file');

/**
 * Run the multer single-file upload middleware inside the request handler so
 * that upload errors (file too large, wrong extension) are surfaced to the
 * handler's try/catch instead of bypassing it via Express's next(err).
 */
function runUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadSingle(req, res, (err: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// GET /api/submissions - 모든 제출물 목록 조회 (Public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const submissions = await submissionService.getAll();
    res.json(submissions);
  } catch (err) {
    console.error('Failed to get submissions:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// POST /api/submissions - 새 제출물 등록 (Admin)
router.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    await runUpload(req, res);
    const { participantName, type, url, description, excludeFromVoting } = req.body;

    let submissionUrl = url;

    // If HTML type with file upload, generate URL from uploaded file
    if (type === 'html' && req.file) {
      submissionUrl = `/uploads/${req.file.filename}`;
    } else if (type === 'html' && !url && !req.file) {
      res.status(400).json({ error: 'HTML 파일을 업로드하거나 URL을 입력해야 합니다', field: 'url' });
      return;
    }

    const submission = await submissionService.create({
      participantName,
      type,
      url: submissionUrl,
      description,
      excludeFromVoting: excludeFromVoting === 'true' || excludeFromVoting === true,
    });

    res.status(201).json(submission);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message, field: err.field });
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: '파일 크기는 10MB를 초과할 수 없습니다', field: 'file' });
        return;
      }
      res.status(400).json({ error: err.message, field: 'file' });
      return;
    }
    if (err instanceof Error && err.message === '.html 파일만 업로드 가능합니다') {
      res.status(400).json({ error: err.message, field: 'file' });
      return;
    }
    console.error('Failed to create submission:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// PUT /api/submissions/:id - 제출물 수정 (Admin)
router.put('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    await runUpload(req, res);
    const { id } = req.params;
    const { participantName, type, url, description, excludeFromVoting } = req.body;

    const updateData: Partial<{
      participantName: string;
      type: 'html' | 'github';
      url: string;
      description: string;
      excludeFromVoting: boolean;
    }> = {};
    if (participantName !== undefined) updateData.participantName = participantName;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (excludeFromVoting !== undefined) {
      updateData.excludeFromVoting = excludeFromVoting === 'true' || excludeFromVoting === true;
    }

    // Handle file upload for HTML type update
    if (req.file) {
      updateData.url = `/uploads/${req.file.filename}`;
    } else if (url !== undefined) {
      updateData.url = url;
    }

    const submission = await submissionService.update(id, updateData);
    res.json(submission);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message, field: err.field });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: '파일 크기는 10MB를 초과할 수 없습니다', field: 'file' });
        return;
      }
      res.status(400).json({ error: err.message, field: 'file' });
      return;
    }
    console.error('Failed to update submission:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// DELETE /api/submissions/:id - 제출물 삭제 (Admin)
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await submissionService.delete(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('Failed to delete submission:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

export default router;
