import { jest } from '@jest/globals';
import request from 'supertest';

jest.mock('firebase-admin/app');
jest.mock('firebase-admin/auth');

import app from '../server.js';

describe('GET /health', () => {
  it('responde { ok: true }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});