// __tests__/frankfurter.test.js
import { jest } from '@jest/globals'
import request from 'supertest'

// 1) Mock firebase-admin/* BEFORE importing app
await jest.unstable_mockModule('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  cert: jest.fn((x) => x),
  getApps: jest.fn(() => []),
}))

// Export ONE shared mock function so tests can control it
const verifyIdTokenMock = jest.fn(async () => ({ uid: 'test-uid' }))
const createUserMock = jest.fn(async ({ email }) => ({
  uid: 'uid_' + (email || 'test'),
  email,
  displayName: null,
}))

await jest.unstable_mockModule('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: verifyIdTokenMock, createUser: createUserMock }),
  __mocks: { verifyIdTokenMock, createUserMock },
}))

// 2) Import the app AFTER mocks
const { default: app } = await import('../server.js')
// also import the exposed mocks so we can tweak them
const { __mocks } = await import('firebase-admin/auth')

// 3) Mock Frankfurter fetches
beforeEach(() => {
  verifyIdTokenMock.mockResolvedValue({ uid: 'test-uid' }) // default: valid
  global.fetch = jest.fn(async (url) => {
    const u = String(url)
    if (u.includes('/currencies')) {
      return { ok: true, json: async () => ({ USD: 'US Dollar', BRL: 'Brazilian Real' }) }
    }
    if (u.includes('/latest')) {
      return {
        ok: true,
        json: async () => ({
          amount: 1,
          base: 'USD',
          date: '2025-09-19',
          rates: { BRL: 5.33 },
        }),
      }
    }
    return { ok: false, json: async () => ({}) }
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Frankfurter (protegidas)', () => {
  it('GET /getCurrencyInfo com token -> 200', async () => {
    const res = await request(app)
      .get('/getCurrencyInfo')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { code: 'USD', name: 'US Dollar' },
      { code: 'BRL', name: 'Brazilian Real' },
    ])
  })

  it('GET /converterMoeda com token -> 200', async () => {
    const res = await request(app)
      .get('/converterMoeda?valor=1&de=USD&para=BRL')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      de: 'USD',
      para: 'BRL',
      taxa: expect.any(Number),
      valorConvertido: expect.any(Number),
      date: expect.any(String),
    })
  })

  it('GET /getCurrencyInfo sem token -> 401', async () => {
    const res = await request(app).get('/getCurrencyInfo')
    expect(res.status).toBe(401)
  })

  it('GET /converterMoeda com token ruim -> 401', async () => {
    __mocks.verifyIdTokenMock.mockRejectedValueOnce(Object.assign(new Error('Invalid token'), { code: 'auth/invalid-id-token' }))

    const res = await request(app)
      .get('/converterMoeda?valor=1&de=USD&para=BRL')
      .set('Authorization', 'Bearer bad')

    expect(res.status).toBe(401)
  })
})