import { categories, uid, type Category, type Look, type Preferences, type Product, type Style } from './model.ts'
import { generateLook } from './engine.ts'
export interface PortraitTile { sheet: 'editorial' | 'minimal'; column: number; row: number; categories: Category[]; alt: string }
export interface VisualReference { id: string; name: string; occasion: string; style: Style; description: string; categories: Category[]; templateId: string; portrait: PortraitTile }
const editorial = (column: number, row: number, makeup: Category[], alt: string): PortraitTile => ({ sheet: 'editorial', column, row, categories: makeup, alt })
const minimal = (column: number, row: number, makeup: Category[], alt: string): PortraitTile => ({ sheet: 'minimal', column, row, categories: makeup, alt })
export const portraitLibrary: PortraitTile[] = [
  editorial(0, 0, ['blush', 'mascara', 'lip'], 'AI-generated adult model with softly rosy cheeks, mascara and a sheer lip look'),
  editorial(1, 0, ['eyeshadow', 'mascara', 'blush', 'lip'], 'AI-generated adult model with gentle neutral eye colour, softly defined lashes and a muted lip look'),
  editorial(2, 0, ['eyeshadow', 'mascara', 'lip'], 'AI-generated adult model with soft brown eye colour and a satin lip look'),
  editorial(0, 1, ['eyeshadow', 'eyeliner', 'mascara', 'blush', 'lip'], 'AI-generated adult model with softly defined upper lash line, neutral eyes and rose-toned lips'),
  editorial(1, 1, ['mascara', 'lip'], 'AI-generated adult model with a minimal lash and lip look'),
  minimal(0, 0, ['blush', 'lip'], 'AI-generated adult model with a gentle cheek and lip look'),
  minimal(1, 0, ['blush', 'mascara'], 'AI-generated adult model with softly rosy cheeks and a light mascara look'),
  minimal(2, 0, ['lip'], 'AI-generated adult model with only a sheer lip-colour look'),
  minimal(0, 1, ['mascara'], 'AI-generated adult model with only a subtle mascara look'),
  minimal(1, 1, ['blush'], 'AI-generated adult model with only softly rosy cheeks'),
  minimal(2, 1, ['eyeshadow'], 'AI-generated adult model with only softly blended neutral eye colour'),
]
export const visualReferences: VisualReference[] = [
  { id: 'daily-rose', name: 'The everyday glow', occasion: 'Everyday', style: 'minimal', description: 'Soft cheeks, a little lash definition, and your favourite lip. Lovely without a long routine.', categories: ['blush', 'mascara', 'lip'], templateId: 'everyday', portrait: portraitLibrary[0] },
  { id: 'daily-two', name: 'Just a little something', occasion: 'Everyday', style: 'minimal', description: 'A light coat of mascara and an easy lip. Two small touches, then you’re out the door.', categories: ['mascara', 'lip'], templateId: 'weekend', portrait: portraitLibrary[4] },
  { id: 'work-soft', name: 'Quietly put together', occasion: 'Work', style: 'minimal', description: 'A soft eye, gentle colour and an easy finish for a day at work.', categories: ['eyeshadow', 'mascara', 'blush', 'lip'], templateId: 'work', portrait: portraitLibrary[1] },
  { id: 'work-light', name: 'The easy workday', occasion: 'Work', style: 'minimal', description: 'Keep it simple: familiar cheeks, lashes and lips. No elaborate eye steps.', categories: ['blush', 'mascara', 'lip'], templateId: 'work', portrait: portraitLibrary[0] },
  { id: 'dinner-soft', name: 'Dinner in soft focus', occasion: 'Dinner', style: 'soft glam', description: 'A softly blended eye and a satin lip mood. A little more definition for an evening out.', categories: ['eyeshadow', 'mascara', 'lip'], templateId: 'dinner', portrait: portraitLibrary[2] },
  { id: 'dinner-rose', name: 'The rosy evening', occasion: 'Dinner', style: 'minimal', description: 'Let cheeks and lips be the moment. A softer dinner look with fewer steps.', categories: ['blush', 'mascara', 'lip'], templateId: 'weekend', portrait: portraitLibrary[0] },
  { id: 'occasion-defined', name: 'A little occasion', occasion: 'Celebration', style: 'defined', description: 'Soft definition around the eyes, a touch of cheek colour and a lip you love.', categories: ['eyeshadow', 'eyeliner', 'mascara', 'blush', 'lip'], templateId: 'celebrate', portrait: portraitLibrary[3] },
  { id: 'occasion-soft', name: 'Softly celebrated', occasion: 'Celebration', style: 'soft glam', description: 'Gentle eyes and soft colour. An occasion look that still feels like you.', categories: ['eyeshadow', 'mascara', 'blush', 'lip'], templateId: 'soft-day', portrait: portraitLibrary[1] },
]
export const referenceById = (id?: string) => visualReferences.find(r => r.id === id)
const categoryKey = (makeup: Category[]) => [...new Set(makeup)].sort().join(',')
/** Match visible cosmetic categories exactly; never silently show extra eye/lip products. */
export function portraitForCategories(makeup: Category[], preferred?: PortraitTile): PortraitTile | undefined {
  const key = categoryKey(makeup)
  if (preferred && categoryKey(preferred.categories) === key) return preferred
  return portraitLibrary.find(p => categoryKey(p.categories) === key)
}
export const portraitForLook = (look: Look) => portraitForCategories(look.steps.map(s => s.category), referenceById(look.referenceId)?.portrait)
export function quickProducts(inventory: Product[], confirmed: Category[]): { inventory: Product[]; selectedIds: string[] } {
  const result = [...inventory]
  const selectedIds: string[] = []
  for (const category of [...new Set(confirmed)]) {
    if (!categories.some(c => c.id === category && c.id !== 'tools')) throw new Error('Choose a makeup category from the list.')
    const existing = inventory.find(p => p.category === category && p.available && !p.sample)
    const product = existing ?? { id: uid(), category, name: '', brand: '', shade: '', finish: '', available: true, sample: false }
    if (!existing) result.push(product)
    selectedIds.push(product.id)
  }
  return { inventory: result, selectedIds }
}
export function generateVisualLook(inventory: Product[], prefs: Preferences, referenceId: string): Look {
  const reference = referenceById(referenceId)
  if (!reference) throw new Error('Choose a look from the gallery.')
  // In a quick look, keep the simpler touches ahead of the slower optional liner.
  const priorities = prefs.time === 5 && reference.categories.includes('eyeliner')
    ? [...reference.categories.filter(c => c !== 'eyeliner'), 'eyeliner'] as Category[]
    : reference.categories
  const look = generateLook(inventory, prefs, reference.templateId, { priorities, maxSteps: 5 })
  const desired = reference.categories.filter(c => !look.steps.some(s => s.category === c))
  return {
    ...look, referenceId, name: reference.name,
    description: `Your ${prefs.occasion.toLowerCase()} look, using ${look.steps.length} product${look.steps.length === 1 ? '' : 's'} you selected. ${desired.length ? 'We’ve simplified the inspiration to fit your bag and time.' : reference.description}`,
    notes: [...(desired.length ? [`Your version leaves out ${desired.map(c => categories.find(x => x.id === c)!.name.toLowerCase()).join(', ')}. No extra products are needed.`] : []), ...look.notes],
  }
}
