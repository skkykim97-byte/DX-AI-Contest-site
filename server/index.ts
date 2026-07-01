import express from 'express';
import path from 'path';
import fs from 'fs';
import submissionsRouter from './routes/submissions.js';
import votesRouter from './routes/votes.js';
import stateRouter from './routes/state.js';
import resultsRouter from './routes/results.js';
import { FileStore } from './store/FileStore.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const fileStore = new FileStore();

// Ensure runtime data directories exist (they are gitignored, so they may be
// absent on a fresh deploy). Created relative to the process working dir,
// matching the paths used by JsonFileStore and the multer upload handler.
for (const dir of ['data', 'uploads']) {
  fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
}

app.use(express.json());

// Static file serving for uploads (resolved from the working directory so it
// works regardless of where the compiled server file is emitted).
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Fallback for uploaded HTML files: when the file isn't on the local disk
// (e.g. after a redeploy on ephemeral hosting), serve it from the durable
// FileStore (Upstash). Only handles .html filenames.
app.get('/uploads/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!/^[\w.-]+\.html$/i.test(filename)) {
      res.status(404).send('Not found');
      return;
    }
    const content = await fileStore.getFile(filename);
    if (content == null) {
      res.status(404).send('Not found');
      return;
    }
    res.type('html').send(content);
  } catch (err) {
    console.error('Failed to serve uploaded file:', err);
    res.status(500).send('Server error');
  }
});

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/submissions', submissionsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/state', stateRouter);
app.use('/api/results', resultsRouter);

// In production, serve the frontend build (vite outputs to <root>/dist).
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
