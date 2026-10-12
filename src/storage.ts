import { categories, initialState, type AppState, type Look, type Preferences, type Product } from './model'
export const STORAGE_KEY = 'use-my-makeup:v1'
const text = (value: unknown): value is string => typeof value === 'string'
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const preferencesValid = (value: unknown): value is Preferences => record(value) && text(value.occasion) && text(value.customOccasion) && [5, 10, 20].includes(value.time as number) && ['minimal', 'soft glam', 'defined', 'colourful'].includes(value.style as string) && ['beginner', 'comfortable'].includes(value.skill as string) && Array.isArray(value.selectedIds) && value.selectedIds.every(text) && typeof value.noFoundation === 'boolean' && typeof value.focusEyes === 'boolean'
const productValid = (value: unknown): value is Product => record(value) && ['id', 'name', 'brand', 'shade', 'finish'].every(key => text(value[key])) && categories.some(c => c.id === value.category) && typeof value.available === 'boolean' && typeof value.sample === 'boolean' && (value.photo === undefined || (text(value.photo) && value.photo.startsWith('data:image/')))
const lookValid = (value: unknown): value is Look => record(value) && (value.imageUrl === undefined || (text(value.imageUrl) && /^\/api\/look-images\/[a-f0-9]{64}\.png$/.test(value.imageUrl))) && (value.referenceId === undefined || text(value.referenceId)) && ['id', 'templateId', 'name', 'description', 'createdAt', 'privateNote', 'feedback', 'helped', 'pricing'].every(key => text(value[key])) && preferencesValid(value.preferences) && typeof value.sample === 'boolean' && typeof value.tried === 'boolean' && [value.ease, value.usefulness].every(n => typeof n === 'number' && n >= 0 && n <= 5) && Array.isArray(value.productIds) && value.productIds.every(text) && Array.isArray(value.notes) && value.notes.every(text) && Array.isArray(value.steps) && value.steps.length > 0 && value.steps.every(s => record(s) && categories.some(c => c.id === s.category) && ['id', 'productId', 'productName', 'instruction', 'tip', 'help'].every(key => text(s[key])) && typeof s.seconds === 'number' && s.seconds > 0)
export function loadState(): { state: AppState; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: initialState(), error: '' }
    const data: unknown = JSON.parse(raw)
    if (!record(data) || data.version !== 1 || !Number.isInteger(data.lookCount) || (data.lookCount as number) < 0 || !text(data.generalFeedback) || !Array.isArray(data.products) || !data.products.every(productValid) || !Array.isArray(data.saved) || !data.saved.every(lookValid) || !(data.current === null || lookValid(data.current)) || !['system', 'light', 'dark'].includes(data.theme as string) || typeof data.onboarded !== 'boolean' || typeof data.analyticsConsent !== 'boolean' || !Array.isArray(data.events) || !data.events.every(e => record(e) && text(e.name) && text(e.at) && (e.value === undefined || text(e.value)))) throw new Error('Invalid saved data')
    if (data.session !== null && (!record(data.session) || !text(data.session.lookId) || !Number.isInteger(data.session.index) || (data.session.index as number) < 0 || !Array.isArray(data.session.skipped) || !data.session.skipped.every(text) || typeof data.session.completed !== 'boolean')) throw new Error('Invalid session')
    return { state: data as unknown as AppState, error: '' }
  } catch {
    return { state: initialState(), error: 'Your saved data could not be opened. It has not been overwritten. Download a backup in Settings, then reset storage to start again.' }
  }
}
export async function persistState(state: AppState): Promise<string> {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return '' }
  catch { return 'Changes are only in memory: device storage is full or unavailable. Remove saved photos or free up space before closing this page.' }
}
export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function readPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.')
  if (file.size > 5 * 1024 * 1024) throw new Error('This image is too large. Choose a photo smaller than 5 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const ratio = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext('2d'); if (!context) throw new Error('Photo previews are unavailable in this browser.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.75)
  } finally { bitmap.close() }
}
