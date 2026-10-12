import { useEffect, useState } from 'react'
import type { Look } from '../model'
import { portraitForLook, visualReferences } from '../visual'
import { Portrait } from './Portrait'
import { useLivePortrait } from '../useLivePortrait'
import { Icon } from './Icon'
export function LookPortrait({ look, onImage, compact = false }: { look: Look; onImage?: (url: string) => void; compact?: boolean }) {
  const tile = portraitForLook(look)
  const [available, setAvailable] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const categories = [...new Set(look.steps.map(s => s.category))].sort()
  const referenceId = look.referenceId ?? visualReferences.find(r => r.occasion === look.preferences.occasion)?.id ?? 'daily-rose'
  const request = attempt > 0 ? { referenceId, categories } : null
  const result = useLivePortrait(`${referenceId}:${categories.join(',')}:${attempt}`, request, onImage)
  useEffect(() => {
    if (compact) return
    const controller = new AbortController()
    void fetch('/api/image-status', { signal: controller.signal }).then(async response => {
      if (!response.ok) return
      const data: unknown = await response.json()
      if (typeof data === 'object' && data && 'available' in data) setAvailable(data.available === true)
    }).catch(() => { /* The cached library and recipe remain available offline. */ })
    return () => controller.abort()
  }, [compact])
  return <figure className={`look-portrait ${compact ? 'compact' : ''}`}>
    <Portrait tile={tile} liveUrl={result.url ?? look.imageUrl} loading={result.loading} />
    <figcaption><span>AI-generated style inspiration</span><p>{result.url || look.imageUrl ? 'Generated from the categories in this recipe.' : tile ? 'A cached model reference for these makeup categories.' : 'An image for this combination is not in the reference library yet.'} Not an exact shade match or a prediction of your result.</p></figcaption>
    {!compact && available && !look.imageUrl && <div className="live-image-option"><button className="text-button" disabled={result.loading} onClick={() => setAttempt(old => old + 1)}><Icon name="sparkles" size={16} />{result.loading ? 'Preparing image…' : 'Generate a fresh reference'}</button><p className="small muted">Sends only occasion, style and product categories to OpenAI. No photos, product names or notes. Image usage is limited.</p></div>}
    {result.message && <p className="small muted" role="status">{result.message}</p>}
  </figure>
}
