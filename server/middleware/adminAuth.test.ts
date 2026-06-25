import { describe, it, expect, vi } from 'vitest';
import { adminAuth } from './adminAuth.js';
import type { Request, Response, NextFunction } from 'express';

function createMockReqRes(token?: string) {
  const req = {
    headers: token !== undefined ? { 'x-admin-token': token } : {},
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('adminAuth middleware', () => {
  it('should call next() with valid token', () => {
    const { req, res, next } = createMockReqRes('admin123');
    adminAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when token is missing', () => {
    const { req, res, next } = createMockReqRes();
    adminAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '관리자 권한이 필요합니다' });
  });

  it('should return 401 when token is invalid', () => {
    const { req, res, next } = createMockReqRes('wrong-password');
    adminAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '관리자 권한이 필요합니다' });
  });
});
