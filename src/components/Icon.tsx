import type { CSSProperties } from 'react'
import { categoryOf, type Product } from '../model'
export type IconName = 'bag' | 'sparkles' | 'heart' | 'settings' | 'plus' | 'arrow' | 'check' | 'close' | 'sun' | 'moon' | 'monitor' | 'clock' | 'edit' | 'trash' | 'chevron' | 'leaf' | 'eye' | 'download' | 'help'
const paths: Record<IconName, string> = {
  bag: 'M6 7h12l2 14H4L6 7Zm3 0V5a3 3 0 0 1 6 0v2',
  sparkles: 'm12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Zm7 0v4m-2-2h4',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4',
  plus: 'M12 5v14M5 12h14', arrow: 'M4 12h16m-6-6 6 6-6 6', check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z', monitor: 'M3 4h18v13H3V4Zm9 13v4m-4 0h8', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2', edit: 'm15 4 5 5M4 20l4-1L20 7l-5-5L3 14l1 6Z', trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7', chevron: 'm9 5 7 7-7 7', leaf: 'M20 3c1 12-4 19-11 16C1 15 5 4 20 3Zm-1 1L5 20', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6', download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6a3 3 0 1 1 5 2c-2 1-2 1-2 3m0 3v.1',
}
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function ProductArt({ product, large = false }: { product: Pick<Product, 'category' | 'photo'>; large?: boolean }) {
  const category = categoryOf(product.category)
  return <div className={`product-art ${large ? 'large' : ''}`} style={{ '--product-color': category.color } as CSSProperties}>
    {product.photo ? <img src={product.photo} alt="Your product photo" /> : <div className={`cosmetic cosmetic-${product.category}`} aria-hidden="true"><span className="cosmetic-cap" /><span className="cosmetic-body"><i /></span><span className="cosmetic-label" /></div>}
  </div>
}
