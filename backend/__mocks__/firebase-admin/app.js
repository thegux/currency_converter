import { jest } from '@jest/globals';

export const initializeApp = jest.fn(() => ({}));
export const cert = jest.fn((svc) => svc);
export const getApps = jest.fn(() => []);