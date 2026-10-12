import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateLook, missingProducts, templates, validateLook } from '../src/engine.ts'
import { categories, defaultPreferences, sampleBag, type Product } from '../src/model.ts'
const bag: Product[] = categories.map(c => ({ id: c.id, category: c.id, name: `My ${c.short}`, brand: '', shade: '', finish: '', available: true, sample: false }))

test('all ten templates produce owned-product recipes within every time budget', () => {
  assert.equal(templates.length, 10)
  for (const template of templates) for (const time of [5, 10, 20] as const) for (const skill of ['beginner', 'comfortable'] as const) {
    const look = generateLook(bag, { ...defaultPreferences(bag), style: template.style, time, skill }, template.id)
    assert.ok(look.steps.length > 0)
    assert.ok(look.steps.reduce((sum, s) => sum + s.seconds, 0) <= time * 60)
    assert.ok(look.steps.every(s => bag.some(p => p.id === s.productId)))
    assert.ok(!look.productIds.includes('tools'))
    validateLook(look, bag)
  }
})
test('a single lip product creates an achievable beginner look', () => {
  const single = bag.filter(p => p.category === 'lip')
  const look = generateLook(single, { ...defaultPreferences(single), time: 5 })
  assert.deepEqual(look.productIds, ['lip'])
  assert.match(look.steps[0].instruction, /lip-intended/)
})
test('excluded and unavailable products never appear in a generated recipe', () => {
  const inventory = bag.map(p => ({ ...p, available: p.id !== 'blush' }))
  const look = generateLook(inventory, { ...defaultPreferences(inventory), selectedIds: ['blush', 'lip', 'tools'] })
  assert.deepEqual(look.productIds, ['lip'])
})
test('no-foundation preference removes base even when explicitly selected', () => {
  const look = generateLook(bag, { ...defaultPreferences(bag), noFoundation: true })
  assert.ok(!look.productIds.includes('base'))
})
test('an eye-focused request does not substitute a cheek or lip product for eye use', () => {
  const inventory = bag.filter(p => ['blush', 'lip'].includes(p.category))
  const look = generateLook(inventory, { ...defaultPreferences(inventory), focusEyes: true, style: 'defined' })
  assert.ok(look.notes.some(n => n.includes('eye focus is unavailable')))
  assert.ok(look.notes.some(n => n.includes('closest feasible variation')))
  assert.ok(!look.steps.some(s => s.instruction.includes('eyelid') || s.instruction.includes('lashes')))
})
test('colourful requests disclose that shades have not been verified', () => {
  const look = generateLook(bag, { ...defaultPreferences(bag), style: 'colourful' })
  assert.ok(look.notes.some(n => n.includes('cannot verify')))
})
test('empty, excluded, and tools-only inventories fail with an actionable error', () => {
  for (const inventory of [[], bag.filter(p => p.category === 'tools')]) assert.throws(() => generateLook(inventory, defaultPreferences(inventory)), /at least one/)
  assert.throws(() => generateLook(bag, { ...defaultPreferences(bag), selectedIds: [] }), /at least one/)
})
test('missing and unavailable products are flagged without changing the saved recipe', () => {
  const look = generateLook(bag, defaultPreferences(bag))
  const original = JSON.stringify(look)
  const deleted = look.productIds[0]
  const unavailable = look.productIds[1]
  const inventory = bag.filter(p => p.id !== deleted).map(p => ({ ...p, available: p.id !== unavailable }))
  assert.deepEqual(missingProducts(look, inventory), [deleted, unavailable])
  assert.equal(JSON.stringify(look), original)
})
test('structured validation rejects unowned, unselected, unavailable and inconsistent references', () => {
  const look = generateLook(bag, defaultPreferences(bag))
  assert.throws(() => validateLook({ ...look, steps: [{ ...look.steps[0], productId: 'invented' }] }, bag), /outside your confirmed selection/)
  assert.throws(() => validateLook({ ...look, preferences: { ...look.preferences, selectedIds: [] } }, bag), /outside your confirmed selection/)
  assert.throws(() => validateLook(look, bag.map(p => ({ ...p, available: false }))), /outside your confirmed selection/)
  assert.throws(() => validateLook({ ...look, productIds: [] }, bag), /does not match/)
  assert.throws(() => validateLook({ ...look, steps: look.steps.map(s => ({ ...s, seconds: 10000 })) }, bag), /exceeds/)
})
test('sample inventory always marks a generated look as demonstration content', () => {
  const demo = sampleBag()
  assert.ok(demo.every(p => p.sample))
  assert.equal(generateLook(demo, defaultPreferences(demo)).sample, true)
  assert.equal(generateLook(bag, defaultPreferences(bag)).sample, false)
})

test('changing a product category flags a saved step instead of allowing unsafe reuse', () => {
  const single = bag.filter(p => p.category === 'blush')
  const look = generateLook(single, defaultPreferences(single))
  const changed = single.map(p => ({ ...p, category: 'lip' as const }))
  assert.deepEqual(missingProducts(look, changed), ['blush'])
  assert.throws(() => validateLook(look, changed), /outside your confirmed selection/)
})
