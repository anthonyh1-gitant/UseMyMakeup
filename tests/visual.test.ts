import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultPreferences, sampleBag, type Product } from '../src/model.ts'
import { generateVisualLook, portraitForCategories, portraitForLook, quickProducts, visualReferences } from '../src/visual.ts'

test('one-tap categories create confirmed products without names, brands or shades', () => {
  const result = quickProducts([], ['blush', 'mascara', 'lip'])
  assert.equal(result.inventory.length, 3)
  assert.ok(result.inventory.every(p => !p.name && !p.brand && !p.shade && !p.sample))
  assert.equal(result.selectedIds.length, 3)
})
test('quick matching remembers existing products without duplicates or overwriting details', () => {
  const product: Product = { id: 'owned-lip', category: 'lip', name: 'My lip colour', brand: 'My brand', shade: 'Rose', finish: 'Satin', available: true, sample: false }
  const result = quickProducts([product], ['lip', 'lip', 'mascara'])
  assert.equal(result.inventory.length, 2)
  assert.equal(result.inventory[0], product)
  assert.equal(result.selectedIds[0], product.id)
})
test('demonstration products never become silently confirmed ownership', () => {
  const demo = sampleBag()
  const result = quickProducts(demo, ['lip'])
  assert.equal(result.inventory.length, demo.length + 1)
  assert.equal(result.inventory.find(p => p.id === result.selectedIds[0])!.sample, false)
  assert.ok(demo.every(p => p.sample))
})
test('each occasion has a visual alternative and a five-minute recipe', () => {
  for (const occasion of ['Everyday', 'Work', 'Dinner', 'Celebration']) {
    const references = visualReferences.filter(r => r.occasion === occasion)
    assert.ok(references.length >= 2)
    for (const reference of references) {
      const match = quickProducts([], reference.categories)
      const look = generateVisualLook(match.inventory, { ...defaultPreferences(match.inventory), occasion, time: 5 }, reference.id)
      assert.ok(look.steps.length >= 1 && look.steps.length <= 5)
      assert.ok(look.steps.reduce((sum, s) => sum + s.seconds, 0) <= 300)
      assert.equal(look.referenceId, reference.id)
      assert.ok(portraitForLook(look), 'Default reference recipe should have matching cached imagery')
      assert.ok(look.steps.every(s => match.selectedIds.includes(s.productId)))
    }
  }
})
test('small bags adapt both recipe and cached image without unowned cheek/eye products', () => {
  const match = quickProducts([], ['mascara', 'lip'])
  const look = generateVisualLook(match.inventory, { ...defaultPreferences(match.inventory), time: 5 }, 'dinner-soft')
  assert.deepEqual(new Set(look.steps.map(s => s.category)), new Set(['mascara', 'lip']))
  assert.deepEqual(new Set(portraitForLook(look)!.categories), new Set(['mascara', 'lip']))
  assert.ok(look.notes.some(n => n.includes('leaves out eyeshadow')))
})
test('every combination of cheeks, lashes and lips has a category-matched image', () => {
  const choices = ['blush', 'mascara', 'lip'] as const
  for (let mask = 1; mask < 8; mask++) {
    const selected = choices.filter((_, i) => mask & (1 << i))
    assert.deepEqual(new Set(portraitForCategories(selected)!.categories), new Set(selected))
  }
})
test('an unsupported combination has an honest image fallback instead of extra makeup', () => {
  assert.equal(portraitForCategories(['eyeliner', 'lip']), undefined)
  assert.equal(portraitForCategories(['base']), undefined)
})
test('empty selections and invalid catalog IDs are rejected', () => {
  const match = quickProducts([], ['lip'])
  assert.throws(() => generateVisualLook(match.inventory, defaultPreferences(match.inventory), 'invented-look'), /gallery/)
  assert.throws(() => generateVisualLook([], defaultPreferences([]), 'daily-rose'), /at least one/)
})
