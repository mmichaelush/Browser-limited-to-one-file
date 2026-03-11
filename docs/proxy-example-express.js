/**
 * Minimal proxy example for production-safe usage.
 *
 * Usage:
 *   npm i express
 *   GITHUB_TOKEN=ghp_xxx BUILDER_API_KEY=secret \
 *   ALLOW_ORIGIN=https://<user>.github.io \
 *   ALLOWED_REPOS=mmichaelush/Browser-limited-to-one-file \
 *   RATE_LIMIT_WINDOW_MS=60000 RATE_LIMIT_MAX=20 \
 *   node docs/proxy-example-express.js
 *
 * Endpoint:
 *   POST /dispatch
 *   body: { owner, repo, workflow, ref, inputs }
 *
 * Optional headers:
 *   X-Builder-Key: must match BUILDER_API_KEY if that env var is configured.
 */

const express = require('express');

const app = express();
app.use(express.json({ limit: '1mb' }));

const allowOrigin = process.env.ALLOW_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Builder-Key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
});

const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 20);
const rateBuckets = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + rateWindowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + rateWindowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count <= rateLimitMax;
}

const allowedRepos = (process.env.ALLOWED_REPOS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

function isRepoAllowed(owner, repo) {
  if (allowedRepos.length === 0) return true;
  return allowedRepos.includes(`${owner}/${repo}`);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, rateLimitMax, rateWindowMs, allowOrigin, allowedRepos });
});

app.post('/dispatch', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Missing GITHUB_TOKEN' });

  const requiredKey = process.env.BUILDER_API_KEY;
  if (requiredKey) {
    const provided = req.header('X-Builder-Key');
    if (provided !== requiredKey) return res.status(401).json({ error: 'Invalid builder key' });
  }

  const { owner, repo, workflow = 'build.yaml', ref = 'main', inputs = {} } = req.body || {};
  if (!owner || !repo) return res.status(400).json({ error: 'owner/repo required' });
  if (!isRepoAllowed(owner, repo)) return res.status(403).json({ error: 'Repository not allowed' });

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  try {
    const gh = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref, inputs }),
    });

    if (gh.status === 204) return res.status(204).end();
    return res.status(gh.status).send(await gh.text());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(8787, () => {
  console.log('Proxy listening on http://localhost:8787');
});
