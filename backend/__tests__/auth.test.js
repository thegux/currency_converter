import { jest } from '@jest/globals'
import request from 'supertest'

await jest.unstable_mockModule('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  cert: jest.fn((x) => x),
  getApps: jest.fn(() => []),
}))

await jest.unstable_mockModule('firebase-admin/auth', () => ({
  getAuth: () => ({
    createUser: jest.fn(async ({ email }) => ({
      uid: 'uid_' + (email || 'test'),
      email,
      displayName: null,
    })),
    verifyIdToken: jest.fn(async (token) => ({ uid: 'test-uid' })),
  }),
}))

// Import app AFTER mocks
const { default: app } = await import('../server.js')

describe('AUTH', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('identitytoolkit.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            idToken: 'fake-id-token',
            refreshToken: 'fake-refresh',
            expiresIn: '3600',
          }),
        }
      }
      return { ok: false, json: async () => ({}) }
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('POST /signup cria usuário e retorna tokens', async () => {
    const res = await request(app).post('/signup').send({
      email: 'a@b.com',
      password: '123456',
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('uid')
    expect(res.body).toHaveProperty('idToken', 'fake-id-token')
  })

  it('POST /signup valida obrigatórios', async () => {
    const res = await request(app).post('/signup').send({ email: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Email e senha são obrigatórios/i)
  })

  it('POST /login retorna tokens', async () => {
    const res = await request(app).post('/login').send({
      email: 'a@b.com',
      password: '123456',
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('idToken', 'fake-id-token')
  })

  it('POST /login credenciais inválidas', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'INVALID_PASSWORD' } }),
    })
    const res = await request(app).post('/login').send({
      email: 'a@b.com',
      password: 'bad',
    })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Credenciais inválidas/i)
  })
})