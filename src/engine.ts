import { uid, productName, type Category, type Look, type Preferences, type Product, type Step } from './model.ts'

interface Template { id: string; name: string; style: Preferences['style']; occasions: string[]; order: Category[]; description: string }
export const templates: Template[] = [
  { id: 'everyday', name: 'The everyday edit', style: 'minimal', occasions: ['Everyday'], order: ['base', 'concealer', 'blush', 'mascara', 'lip', 'powder'], description: 'A few thoughtful touches for an easy, wearable everyday look.' },
  { id: 'work', name: 'Quietly polished', style: 'minimal', occasions: ['Work'], order: ['base', 'concealer', 'powder', 'blush', 'mascara', 'lip'], description: 'Simple, repeatable steps for a comfortable workday look.' },
  { id: 'weekend', name: 'A few favourite things', style: 'minimal', occasions: ['Everyday', 'Dinner', 'Celebration', 'Custom'], order: ['concealer', 'blush', 'lip', 'mascara', 'base'], description: 'An uncomplicated routine built around a few familiar favourites.' },
  { id: 'dinner', name: 'Dinner in soft focus', style: 'soft glam', occasions: ['Dinner'], order: ['base', 'concealer', 'eyeshadow', 'mascara', 'blush', 'lip', 'powder'], description: 'A softly layered look, with gentle eye definition and a finishing touch of lip colour.' },
  { id: 'celebrate', name: 'A little occasion', style: 'soft glam', occasions: ['Celebration'], order: ['base', 'eyeshadow', 'eyeliner', 'mascara', 'blush', 'lip', 'powder', 'bronzer'], description: 'A little extra time for careful application, made for a special occasion.' },
  { id: 'soft-day', name: 'Softly put together', style: 'soft glam', occasions: ['Everyday', 'Work', 'Custom'], order: ['base', 'eyeshadow', 'blush', 'mascara', 'lip', 'concealer'], description: 'Soft edges and a light touch, using familiar products from your bag.' },
  { id: 'defined-day', name: 'The defined edit', style: 'defined', occasions: ['Everyday', 'Work'], order: ['eyeliner', 'mascara', 'base', 'blush', 'lip', 'powder'], description: 'Give your eye products a moment, with simple definition and a balanced finish.' },
  { id: 'defined-night', name: 'After-hours definition', style: 'defined', occasions: ['Dinner', 'Celebration', 'Custom'], order: ['base', 'eyeshadow', 'eyeliner', 'mascara', 'bronzer', 'blush', 'lip'], description: 'A considered evening routine with eye definition, using only what you select.' },
  { id: 'colour-day', name: 'A small pop of colour', style: 'colourful', occasions: ['Everyday', 'Work'], order: ['eyeshadow', 'blush', 'lip', 'mascara', 'base'], description: 'Let an eye or lip product you own be the focal point. Keep the rest simple.' },
  { id: 'colour-night', name: 'Your colour moment', style: 'colourful', occasions: ['Dinner', 'Celebration', 'Custom'], order: ['eyeshadow', 'eyeliner', 'lip', 'mascara', 'blush', 'base'], description: 'A playful occasion look, built around the colours actually in your bag.' },
]

const instructions: Record<Category, { instruction: string; tip: string; help: string; seconds: number }> = {
  base: { instruction: 'Apply a small amount where you want coverage. Use the application method on the product label, then soften the edges for an even finish.', tip: 'Start with less than you think you need. You can add a little more.', help: 'Blending means gently softening the edge of a product so there is no distinct line. Use the fingers, sponge or brush recommended on your product.', seconds: 100 },
  concealer: { instruction: 'Dot a small amount only where you want extra coverage, following the product’s intended use. Gently tap the edges to blend.', tip: 'Let a thin layer settle before adding more.', help: 'Tapping is a light pressing motion instead of rubbing. Follow the label about where this concealer can be used.', seconds: 60 },
  powder: { instruction: 'Use a small amount of powder on the areas where you want a less shiny finish, using the applicator recommended on the label.', tip: 'A light layer is enough to start. You can leave areas you prefer luminous.', help: 'A light layer means a small amount spread thinly, rather than packing it onto one spot.', seconds: 40 },
  blush: { instruction: 'Apply a little blush to your cheeks using the method on its label. Soften the edges with gentle tapping or sweeping motions.', tip: 'Build the colour gradually and stop whenever you like the result.', help: 'Softening the edges means spreading the border of the colour gently into the surrounding area. There is no single correct placement.', seconds: 60 },
  bronzer: { instruction: 'Lightly apply your bronzer to areas of the face where you would like warmth, following its label. Keep the first layer sheer and blend the edges.', tip: 'This step is optional; skip it if you prefer your look without bronzer.', help: 'Sheer means a thin layer through which you can still see the skin underneath.', seconds: 60 },
  eyeshadow: { instruction: 'Choose one shade from this eye product that you enjoy. Apply a light layer to the eyelid with eyes gently closed, staying away from the inner rim. Soften the edges.', tip: 'One shade is enough. Use a shade you know rather than trying to match an imagined colour.', help: 'The eyelid is the skin over your eye when it is closed. Blending means softening the edge of the colour with small, gentle movements. The outer corner is the end of the eye closest to your temple.', seconds: 100 },
  eyeliner: { instruction: 'Use this eye-intended liner to make short, light strokes near your upper lashes, following its label. Join the strokes if you want a more continuous line. Avoid the inner rim.', tip: 'A short line is perfectly enough. A wing is optional, never necessary.', help: 'The upper lash line is where your upper eyelashes grow. Short strokes are easier to control than one long line. Keep product out of the eye itself.', seconds: 90 },
  mascara: { instruction: 'Brush a light coat of this mascara through your upper lashes, following its label and keeping the wand away from the eye. Let it settle before adding another coat if desired.', tip: 'Look slightly down and take your time. You can skip lower lashes.', help: 'One coat means one light application through the lashes. Avoid touching the eye with the wand.', seconds: 50 },
  lip: { instruction: 'Apply a light layer of this lip-intended product to your lips, following its label. Start at the centre and work gently towards the edges.', tip: 'A light layer can feel easier to wear. Add more only if you want.', help: 'Lip-intended means the product is labelled for use on lips. We do not substitute eye or cheek products here.', seconds: 40 },
  tools: { instruction: '', tip: '', help: '', seconds: 0 },
}

/** Deterministic curated fallback. No AI service, invented products or cross-area substitutions. */
export function generateLook(products: Product[], preferences: Preferences, templateId?: string, options: { priorities?: Category[]; maxSteps?: number } = {}): Look {
  const selected = products.filter(p => p.available && preferences.selectedIds.includes(p.id) && p.category !== 'tools' && !(preferences.noFoundation && p.category === 'base'))
  if (!selected.length) throw new Error('Choose at least one available makeup product. Brushes and tools alone cannot create a look.')
  const sorted = [...templates].sort((a, b) => score(b) - score(a))
  function score(template: Template) {
    return (template.style === preferences.style ? 20 : 0) + (template.occasions.includes(preferences.occasion) ? 10 : 0) + selected.filter(p => template.order.includes(p.category)).length
  }
  const template = (templateId ? templates.find(t => t.id === templateId) : undefined) ?? sorted[0]
  const order = options.priorities ? [...options.priorities] : preferences.focusEyes ? ['eyeshadow', 'eyeliner', 'mascara', ...template.order] as Category[] : [...template.order]
  for (const item of selected) if (!order.includes(item.category)) order.push(item.category)
  const uniqueOrder = [...new Set(order)]
  const notes: string[] = []
  if (preferences.style === 'colourful') notes.push('This is a colour-focused template. We cannot verify how vivid your shades are; choose a shade you enjoy. If your products are neutral, this will be a neutral variation.')
  if (['defined', 'soft glam'].includes(preferences.style) && !selected.some(p => p.category === 'eyeshadow' || p.category === 'eyeliner')) notes.push('Your selected bag has no eyeshadow or eyeliner. This is the closest feasible variation with your products; eye definition is optional and is left out.')
  if (preferences.focusEyes && !selected.some(p => ['eyeshadow', 'eyeliner', 'mascara'].includes(p.category))) notes.push('No eye-intended product is selected, so the eye focus is unavailable. This version uses your other selected products without substituting them around your eyes.')
  const steps: Step[] = []
  let seconds = 0
  const budget = preferences.time * 60
  const multiplier = preferences.skill === 'beginner' ? 1.2 : 1
  for (const category of uniqueOrder) {
    if (steps.length >= (options.maxSteps ?? Infinity)) break
    const product = selected.find(p => p.category === category)
    if (!product) continue
    const instruction = instructions[category]
    const duration = Math.ceil(instruction.seconds * multiplier)
    if (seconds + duration > budget) continue
    steps.push({ id: uid(), productId: product.id, category: product.category, productName: productName(product), ...instruction, seconds: duration })
    seconds += duration
  }
  if (selected.length > steps.length) notes.push('To keep this achievable in your time, we use one product per category and prioritise a few steps. Other selected products stay in your bag.')
  if (steps.length <= 2) notes.push('A small bag is enough. This is a simple finishing-touch look, rather than a full-face routine.')
  notes.push('Optional simplification: skip any step you do not want. No extra products are needed.')
  const look: Look = {
    id: uid(), templateId: template.id, name: template.name, description: `${template.description} Adapted for ${preferences.occasion === 'Custom' ? preferences.customOccasion.trim() || 'your occasion' : preferences.occasion.toLowerCase()} and your ${preferences.time}-minute window.`,
    createdAt: new Date().toISOString(), preferences: { ...preferences, selectedIds: selected.map(p => p.id) },
    steps, productIds: steps.map(s => s.productId), notes, sample: steps.some(s => selected.find(p => p.id === s.productId)?.sample),
    tried: false, ease: 0, usefulness: 0, privateNote: '', feedback: '', helped: '', pricing: '',
  }
  validateLook(look, products)
  return look
}

/** Validate every product reference against inventory and reject malformed/unowned output. */
export function validateLook(look: Look, inventory: Product[]) {
  const ids = new Set(inventory.filter(p => p.available && p.category !== 'tools' && !(look.preferences.noFoundation && p.category === 'base')).map(p => p.id))
  const selected = new Set(look.preferences.selectedIds)
  if (!look.steps.length || look.steps.some(s => !ids.has(s.productId) || !selected.has(s.productId) || inventory.find(p => p.id === s.productId)?.category !== s.category || !Number.isFinite(s.seconds) || s.seconds <= 0)) throw new Error('This look references a product outside your confirmed selection. Please create a new look.')
  if (look.productIds.length !== look.steps.length || look.productIds.some((id, i) => id !== look.steps[i].productId)) throw new Error('The look’s product list does not match its steps.')
  if (look.steps.reduce((sum, s) => sum + s.seconds, 0) > look.preferences.time * 60) throw new Error('This look exceeds the available time.')
}
export const missingProducts = (look: Look, products: Product[]) => look.productIds.filter(id => !products.some(p => p.id === id && p.available && p.category === look.steps.find(s => s.productId === id)?.category))
