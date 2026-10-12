import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'
import { categories, type Category } from '../src/model.ts'
import { referenceById } from '../src/visual.ts'
export interface ImageRequest { referenceId: string; categories: Category[] }
export function parseImageRequest(value: unknown): ImageRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid image request')
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !['referenceId', 'categories'].includes(key)) || typeof data.referenceId !== 'string' || !referenceById(data.referenceId) || !Array.isArray(data.categories) || !data.categories.length || data.categories.length > 5 || !data.categories.every(c => categories.some(known => known.id === c && known.id !== 'tools')) || new Set(data.categories).size !== data.categories.length) throw new Error('Choose valid recipe categories')
  return { referenceId: data.referenceId, categories: [...data.categories].sort() as Category[] }
}
export const imageCacheKey = (request: ImageRequest) => createHash('sha256').update(JSON.stringify(request)).digest('hex')
export function buildImagePrompt(request: ImageRequest): string {
  const reference = referenceById(request.referenceId)!
  const selected = request.categories.map(c => categories.find(item => item.id === c)!.name).join(', ')
  const omitted = categories.filter(c => c.id !== 'tools' && !request.categories.includes(c.id)).map(c => c.name).join(', ')
  return `Create one realistic beauty-editorial close-up face-and-shoulders portrait of an adult model aged 25-45 for an inclusive makeup inspiration app. Occasion: ${reference.occasion}. Style: ${reference.style}. Natural skin texture, warm ivory background, soft window light, no text, no brands, no before-and-after. Use ONLY these makeup categories: ${selected}. Omit all these categories: ${omitted}. Natural untouched colour in areas with no selected product. Use plausible soft neutral shades, do not imply exact colour matching to a user's products. Lip products only on lips, eye products only on appropriate eye areas, cheek products only on cheeks. No cross-area substitutions. No attractiveness scores, skin diagnoses, procedures or prediction of a real user's appearance. Achievable gentle application, full face visible, no hands or tools. This is AI-generated style inspiration, not a photograph of a user or promised result.`
}
export interface ImageProvider { (request: ImageRequest, apiKey: string): Promise<Buffer> }
export const openAIProvider: ImageProvider = async (request, apiKey) => {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: buildImagePrompt(request), n: 1, size: '1024x1536', quality: 'low', output_format: 'png' }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) throw new Error('Image provider unavailable')
  const data: unknown = await response.json()
  const encoded = data && typeof data === 'object' && 'data' in data && Array.isArray(data.data) && data.data[0] && typeof data.data[0].b64_json === 'string' ? data.data[0].b64_json : null
  if (!encoded || encoded.length > 24_000_000) throw new Error('Invalid image provider response')
  const buffer = Buffer.from(encoded, 'base64')
  if (!buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Image provider returned an invalid PNG')
  return buffer
}
export function createImageMiddleware(options: { getKey: () => string | undefined; provider?: ImageProvider; directory?: string; limit?: number }) {
  const directory = options.directory ?? resolve('.cache/look-images')
  const provider = options.provider ?? openAIProvider
  const configuredLimit = options.limit ?? 8
  const limit = Math.min(20, Math.max(0, Number.isFinite(configuredLimit) ? Math.floor(configuredLimit) : 8))
  let windowStart = Date.now()
  let used = 0
  const pending = new Map<string, Promise<void>>()
  function json(res: ServerResponse, code: number, value: unknown) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(value)) }
  return async function middleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const pathname = new URL(req.url ?? '/', 'http://internal').pathname
    if (!pathname.startsWith('/api/')) return next()
    const apiKey = options.getKey()
    if (pathname === '/api/image-status' && req.method === 'GET') return json(res, 200, { available: Boolean(apiKey) && limit > 0 })
    const imageFile = pathname.match(/^\/api\/look-images\/([a-f0-9]{64})\.png$/)
    if (imageFile && req.method === 'GET') {
      try { const data = await readFile(resolve(directory, `${imageFile[1]}.png`)); res.setHeader('Content-Type', 'image/png'); res.setHeader('Cache-Control', 'private, max-age=86400'); res.end(data) }
      catch { json(res, 404, { error: 'Image not available' }) }
      return
    }
    if (pathname !== '/api/look-image') return json(res, 404, { error: 'Not found' })
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' })
    if (!apiKey || limit === 0) return json(res, 503, { error: 'Live image generation is not connected. The cached gallery and recipes still work.' })
    const origin = req.headers.origin
    const expectedHost = req.headers['x-forwarded-host'] ?? req.headers.host
    try { if (!origin || new URL(origin).host !== expectedHost) return json(res, 403, { error: 'Use the image button in this app' }) }
    catch { return json(res, 403, { error: 'Invalid origin' }) }
    if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Send JSON' })
    try {
      let raw = ''
      for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 2048) return json(res, 413, { error: 'Request too large' }) }
      let request: ImageRequest
      try { request = parseImageRequest(JSON.parse(raw)) } catch { return json(res, 400, { error: 'Invalid recipe categories' }) }
      const key = imageCacheKey(request)
      const target = resolve(directory, `${key}.png`)
      try { await readFile(target); return json(res, 200, { url: `/api/look-images/${key}.png`, cached: true }) } catch { /* cache miss */ }
      if (!pending.has(key)) {
        if (Date.now() - windowStart >= 3_600_000) { windowStart = Date.now(); used = 0 }
        if (used >= limit || pending.size >= 2) return json(res, 429, { error: 'Image limit reached. Your recipe is still ready.' })
        used++ // Count failed calls too; provider retries must not bypass the spending cap.
        const work = (async () => { const image = await provider(request, apiKey); await mkdir(directory, { recursive: true }); await writeFile(target, image, { mode: 0o600 }) })()
        pending.set(key, work)
        void work.then(() => pending.delete(key), () => pending.delete(key))
      }
      await pending.get(key)
      return json(res, 200, { url: `/api/look-images/${key}.png`, cached: false })
    } catch { return json(res, 502, { error: 'Image generation failed. Your products and recipe are safe.' }) }
  }
}
export function lookImageApi(): Plugin {
  const environment = loadEnv('development', process.cwd(), '')
  const middleware = createImageMiddleware({ getKey: () => process.env.MAKEUP_IMAGE_API_KEY || environment.MAKEUP_IMAGE_API_KEY, limit: Number(process.env.MAKEUP_IMAGE_HOURLY_LIMIT || environment.MAKEUP_IMAGE_HOURLY_LIMIT || '8') })
  return { name: 'makeup-server-images', configureServer(server) { server.middlewares.use((req, res, next) => { void middleware(req, res, next) }) }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void middleware(req, res, next) }) } }
}
