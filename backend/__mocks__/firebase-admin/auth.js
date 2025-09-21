import { jest } from '@jest/globals';

let verifyOk = true;

export const getAuth = () => ({
  createUser: jest.fn(async ({ email }) => ({
    uid: 'uid_' + (email || 'test'),
    email,
    displayName: null,
  })),
  verifyIdToken: jest.fn(async (token) => {
    if (!verifyOk || !token || token === 'bad') {
      const e = new Error('Invalid token');
      e.code = 'auth/invalid-id-token';
      throw e;
    }
    return { uid: 'test-uid' };
  }),
});

export function __setVerify(ok) {
  verifyOk = ok;
}