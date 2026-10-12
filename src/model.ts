export const categories = [
  { id: 'base', name: 'Foundation / tint', short: 'Base', color: '#d1a180' },
  { id: 'concealer', name: 'Concealer', short: 'Concealer', color: '#e0b397' },
  { id: 'powder', name: 'Powder', short: 'Powder', color: '#dfc6ac' },
  { id: 'blush', name: 'Blush', short: 'Blush', color: '#c66f82' },
  { id: 'bronzer', name: 'Bronzer', short: 'Bronzer', color: '#a86e49' },
  { id: 'eyeshadow', name: 'Eyeshadow', short: 'Eyeshadow', color: '#a792ae' },
  { id: 'eyeliner', name: 'Eyeliner', short: 'Eyeliner', color: '#615565' },
  { id: 'mascara', name: 'Mascara', short: 'Mascara', color: '#423b44' },
  { id: 'lip', name: 'Lip product', short: 'Lips', color: '#a95670' },
  { id: 'tools', name: 'Brushes / tools', short: 'Tools', color: '#b49a8e' },
] as const
export type Category = typeof categories[number]['id']
export type Theme = 'light' | 'dark' | 'system'
export type Page = 'bag' | 'create' | 'saved' | 'settings' | 'look' | 'follow'
export type Style = 'minimal' | 'soft glam' | 'defined' | 'colourful'
export interface Product {
  id: string; category: Category; name: string; brand: string; shade: string;
  finish: string; available: boolean; sample: boolean; photo?: string;
}
export interface Preferences {
  occasion: string; customOccasion: string; time: 5 | 10 | 20; style: Style;
  skill: 'beginner' | 'comfortable'; selectedIds: string[]; noFoundation: boolean; focusEyes: boolean;
}
export interface Step {
  id: string; productId: string; category: Category; productName: string; instruction: string; tip: string; help: string; seconds: number;
}
export interface Look {
  id: string; templateId: string; name: string; description: string; createdAt: string;
  preferences: Preferences; steps: Step[]; productIds: string[]; notes: string[];
  sample: boolean; tried: boolean; ease: number; usefulness: number; privateNote: string;
  feedback: string; helped: string; pricing: string;
}
export interface Session { lookId: string; index: number; skipped: string[]; completed: boolean }
export interface LocalEvent { name: string; at: string; value?: string }
export interface AppState {
  version: 1; lookCount: number; generalFeedback: string; onboarded: boolean; products: Product[]; saved: Look[]; current: Look | null;
  session: Session | null; theme: Theme; analyticsConsent: boolean; events: LocalEvent[];
}
export const initialState = (): AppState => ({ version: 1, lookCount: 0, generalFeedback: '', onboarded: false, products: [], saved: [], current: null, session: null, theme: 'system', analyticsConsent: false, events: [] })
export const uid = () => crypto.randomUUID()
export const categoryOf = (category: Category) => categories.find(c => c.id === category)!
export const productName = (product: Product) => product.name || categoryOf(product.category).name
export const defaultPreferences = (products: Product[]): Preferences => ({ occasion: 'Everyday', customOccasion: '', time: 10, style: 'minimal', skill: 'beginner', selectedIds: products.filter(p => p.available && p.category !== 'tools').map(p => p.id), noFoundation: false, focusEyes: false })
export const sampleBag = (): Product[] => [
  { category: 'base', name: 'Everyday skin tint', brand: '', shade: 'Your usual shade', finish: 'Natural' },
  { category: 'blush', name: 'Rose cream blush', brand: '', shade: 'Muted rose', finish: 'Satin' },
  { category: 'eyeshadow', name: 'Soft neutral palette', brand: '', shade: 'Taupe & soft brown', finish: 'Matte' },
  { category: 'mascara', name: 'Everyday mascara', brand: '', shade: 'Black', finish: '' },
  { category: 'lip', name: 'Rose lip colour', brand: '', shade: 'Rose', finish: 'Satin' },
].map(product => ({ ...product, id: uid(), available: true, sample: true })) as Product[]
export const minutesFor = (look: Look) => Math.max(1, Math.ceil(look.steps.reduce((sum, step) => sum + step.seconds, 0) / 60))
