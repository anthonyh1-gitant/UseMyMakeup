import { useState } from 'react'
import { type PortraitTile } from '../visual'
import { Icon } from './Icon'
export function Portrait({ tile, className = '', liveUrl, loading = false }: { tile?: PortraitTile; className?: string; liveUrl?: string; loading?: boolean }) {
  const [failedSource, setFailedSource] = useState('')
  const source = (liveUrl && liveUrl !== failedSource ? liveUrl : '') || (tile ? `/looks/${tile.sheet}-models.png` : '')
  const failed = source === failedSource
  return <div className={`portrait-frame ${className}`}>
    {source && !failed ? <img src={source} alt={liveUrl ? 'AI-generated model illustrating the makeup categories in your recipe' : tile!.alt} className={source === liveUrl ? 'live-portrait' : 'portrait-sheet'} style={source !== liveUrl && tile ? { left: `${tile.column * -100}%`, top: `${tile.row * -100}%` } : undefined} onError={() => setFailedSource(source)} /> : <div className="portrait-fallback"><Icon name="sparkles" size={35} /><strong>{loading ? 'Putting your inspiration together…' : 'Your look, in simple steps.'}</strong><p>{loading ? 'You can follow your recipe while we prepare the image.' : 'A matching model image isn’t available for this combination. Your recipe still uses only your products.'}</p></div>}
    {loading && source && <span className="portrait-loading" role="status">Preparing your image…</span>}
  </div>
}
