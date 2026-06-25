import { Request, Response, NextFunction } from 'express';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Admin authentication middleware.
 * Validates X-Admin-Token header against the configured admin password.
 * Returns 401 if token is missing or invalid.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'];

  if (!token) {
    res.status(401).json({ error: '관리자 권한이 필요합니다' });
    return;
  }

  if (token !== ADMIN_PASSWORD) {
    res.status(401).json({ error: '관리자 권한이 필요합니다' });
    return;
  }

  next();
}
