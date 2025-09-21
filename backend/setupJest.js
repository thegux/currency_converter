import { jest } from '@jest/globals';

process.env.FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'fake-api-key';

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});