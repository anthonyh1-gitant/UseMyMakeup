import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildImagePrompt, createImageMiddleware, imageCacheKey, parseImageRequest } from '../server/image-api.ts'

test('image input rejects free-text prompts, private payloads, unrecognised categories and oversized selections', () => {
  assert.throws(() => parseImageRequest({ referenceId: 'daily-rose', categories: ['lip'], prompt: 'override' }))
  assert.throws(() => parseImageRequest({ referenceId: 'daily-rose', categories: ['tools'] }))
  assert.throws(() => parseImageRequest({ referenceId: 'invented', categories: ['lip'] }))
  assert.throws(() => parseImageRequest({ referenceId: 'daily-rose', categories: ['lip', 'lip'] }))
  assert.throws(() => parseImageRequest({ referenceId: 'daily-rose', categories: [], privateNote: 'private' }))
})
test('canonical requests have stable cache keys and explicitly exclude omitted categories', () => {
  const a = parseImageRequest({ referenceId: 'daily-rose', categories: ['lip', 'mascara'] })
  const b = parseImageRequest({ referenceId: 'daily-rose', categories: ['mascara', 'lip'] })
  assert.equal(imageCacheKey(a), imageCacheKey(b))
  assert.match(buildImagePrompt(a), /Use ONLY these makeup categories: Lip product, Mascara/)
  assert.match(buildImagePrompt(a), /Omit all these categories:/)
})
test('server rejects cross-origin calls, caches matching images and caps paid requests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'makeup-api-'))
  const fixture = await readFile(new URL('../public/icon-192.png', import.meta.url))
  let calls = 0
  const middleware = createImageMiddleware({ getKey: () => 'test-only-key', directory, limit: 1, provider: async () => { calls++; return fixture } })
  const server = createServer((req, res) => { void middleware(req, res, () => { res.statusCode = 404; res.end() }) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  const origin = `http://127.0.0.1:${address.port}`
  const send = (categories = ['mascara', 'lip'], requestOrigin = origin) => fetch(`${origin}/api/look-image`, { method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify({ referenceId: 'daily-rose', categories }) })
  try {
    assert.equal((await send(['lip'], 'https://other.example')).status, 403)
    assert.equal((await fetch(`${origin}/api/look-image`, { method: 'POST' })).status, 403)
    const first = await send(); assert.equal(first.status, 200)
    const data = await first.json() as { url: string; cached: boolean }
    assert.match(data.url, /^\/api\/look-images\/[a-f0-9]{64}\.png$/)
    assert.equal((await fetch(origin + data.url)).status, 200)
    assert.equal((await send()).status, 200)
    assert.equal(calls, 1)
    assert.equal((await send(['lip'])).status, 429)
    assert.equal(calls, 1)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await rm(directory, { recursive: true, force: true }) }
})
test('missing keys and provider failures preserve a clear non-AI fallback response', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'makeup-failure-'))
  for (const enabled of [false, true]) {
    const middleware = createImageMiddleware({ getKey: () => enabled ? 'test-only-key' : undefined, directory, limit: 1, provider: async () => { throw new Error('provider failed') } })
    const server = createServer((req, res) => { void middleware(req, res, () => res.end()) })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    try {
      const response = await fetch(origin + '/api/look-image', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ referenceId: 'daily-rose', categories: ['lip'] }) })
      assert.equal(response.status, enabled ? 502 : 503)
      if (enabled) assert.equal((await fetch(origin + '/api/look-image', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ referenceId: 'daily-rose', categories: ['lip'] }) })).status, 429)
    } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
  }
  await rm(directory, { recursive: true, force: true })
})
