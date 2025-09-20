import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import serviceAccount from './serviceAccountKey.js';

const {
  PORT = 3000,
  FIREBASE_API_KEY,
} = process.env;

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();

const app = express();
app.use(cors());
app.use(express.json());

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    }
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const user = await auth.createUser({ email, password, displayName });

    const signRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const tokens = await signRes.json();
    if (!signRes.ok) {
      return res.status(500).json({ error: 'Created but failed to sign in', details: tokens });
    }

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Signup failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const signRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await signRes.json();
    if (!signRes.ok) {
      return res.status(401).json({ error: 'Invalid credentials', details: data });
    }

    res.json({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Login failed' });
  }
});

const FR_BASE = 'https://api.frankfurter.app';

app.get('/getCurrencyInfo', requireAuth, async (_req, res) => {
  try {
    const r = await fetch(`${FR_BASE}/currencies`);
    if (!r.ok) return res.status(502).json({ error: 'Frankfurter currencies error' });
    const data = await r.json();
    res.json(Object.entries(data).map(([code, name]) => ({ code, name })));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to fetch currencies' });
  }
});

app.get('/converterMoeda', requireAuth, async (req, res) => {
  try {
    const valor = Number(req.query.valor);
    const de = String(req.query.de || '').toUpperCase();
    const para = String(req.query.para || '').toUpperCase();
    if (!Number.isFinite(valor) || !de || !para) {
      return res.status(400).json({ error: 'valor, de and para are required' });
    }

    const url = `${FR_BASE}/latest?amount=${encodeURIComponent(valor)}&from=${encodeURIComponent(de)}&to=${encodeURIComponent(para)}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'Frankfurter conversion error' });
    const data = await r.json();

    const valorConvertido = data?.rates?.[para];
    if (typeof valorConvertido !== 'number') {
      return res.status(400).json({ error: 'Invalid currency or conversion not available' });
    }

    const taxa = valor ? valorConvertido / valor : null;
    res.json({ de, para, taxa, valorConvertido, date: data.date });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Conversion failed' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});