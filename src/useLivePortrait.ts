import { useEffect, useRef, useState } from 'react'
/** Optional, explicit server-side generation. No keys or private inventory data in the browser. */
export function useLivePortrait(signature: string, request: { referenceId: string; categories: string[] } | null, onReady?: (url: string) => void) {
  const ready = useRef(onReady)
  useEffect(() => { ready.current = onReady }, [onReady])
  const [result, setResult] = useState<{ signature: string; url?: string; loading: boolean; message?: string }>({ signature: '', loading: false })
  const body = request ? JSON.stringify({ referenceId: request.referenceId, categories: [...request.categories].sort() }) : null
  useEffect(() => {
    if (!body) return
    const controller = new AbortController()
    void fetch('/api/look-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 429 ? 'Image limit reached. Your recipe is still ready.' : 'Live images aren’t available. Your recipe is still ready.')
        const data: unknown = await response.json()
        if (typeof data !== 'object' || !data || !('url' in data) || typeof data.url !== 'string' || !/^\/api\/look-images\/[a-f0-9]{64}\.png$/.test(data.url)) throw new Error('Image unavailable. Your recipe is still ready.')
        setResult({ signature, url: data.url, loading: false })
        ready.current?.(data.url)
      })
      .catch(error => { if (!controller.signal.aborted) setResult({ signature, loading: false, message: error instanceof Error ? error.message : 'Image unavailable. Your recipe is still ready.' }) })
    return () => controller.abort()
  }, [signature, body])
  return result.signature === signature ? result : { signature, loading: Boolean(request) }
}
