import { useState, type FormEvent } from 'react'
import { categories, uid, type Product } from '../model'
import { readPhoto } from '../storage'
import { Icon, ProductArt } from './Icon'
export function ProductForm({ product, onSave, onCancel }: { product?: Product; onSave: (product: Product) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Product>(product ?? { id: uid(), category: 'blush', name: '', brand: '', shade: '', finish: '', available: true, sample: false })
  const [photo, setPhoto] = useState(product?.photo ?? '')
  const [savePhoto, setSavePhoto] = useState(Boolean(product?.photo))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const patch = (changes: Partial<Product>) => setDraft(previous => ({ ...previous, ...changes }))
  async function choosePhoto(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try { setPhoto(await readPhoto(file)); setSavePhoto(false) }
    catch (e) { setError(e instanceof Error ? e.message : 'This photo could not be opened. Try another image.') }
    finally { setBusy(false) }
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    onSave({ ...draft, name: draft.name.trim(), brand: draft.brand.trim(), shade: draft.shade.trim(), photo: savePhoto && photo ? photo : undefined })
  }
  return <form onSubmit={submit} className="product-form">
    {draft.sample && <div className="notice">This is a demonstration product. Add your own product to create a real-inventory look.</div>}
    <fieldset><legend>What kind of product?</legend><div className="category-grid">{categories.map(c => <button type="button" className={`category-option ${draft.category === c.id ? 'selected' : ''}`} key={c.id} aria-pressed={draft.category === c.id} onClick={() => patch({ category: c.id })}>{c.short}</button>)}</div></fieldset>
    <div className="field-pair"><label>Product name <span>optional</span><input autoFocus maxLength={80} value={draft.name} onChange={e => patch({ name: e.target.value })} placeholder="e.g. My everyday blush" /></label><label>Brand <span>optional</span><input maxLength={60} value={draft.brand} onChange={e => patch({ brand: e.target.value })} placeholder="Any brand, or leave blank" /></label></div>
    <div className="field-pair"><label>Shade description <span>optional</span><input maxLength={80} value={draft.shade} onChange={e => patch({ shade: e.target.value })} placeholder="e.g. Soft rose, warm brown" /></label><label>Finish <span>optional</span><select value={draft.finish} onChange={e => patch({ finish: e.target.value })}><option value="">Not sure / unspecified</option>{['Natural', 'Matte', 'Satin', 'Shimmer', 'Glossy', 'Dewy'].map(f => <option key={f}>{f}</option>)}</select></label></div>
    <details className="photo-section"><summary><Icon name="plus" size={16} /> Add a product photo <span>optional</span></summary><p className="small muted">Photo recognition is not connected. Images stay in this browser; nothing is uploaded to a service. Enter product details yourself.</p><label className="file-label">Choose photo (JPEG, PNG or WebP, up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void choosePhoto(e.target.files?.[0]); e.target.value = '' }} /></label>{busy && <p role="status">Preparing photo…</p>}{photo && <><ProductArt product={{ category: draft.category, photo }} /><label className="checkbox-line"><input type="checkbox" checked={savePhoto} onChange={e => setSavePhoto(e.target.checked)} /> Save this photo on this device</label><p className="small muted">Unchecked photos are discarded when this form closes. Saved photos are resized to reduce storage.</p><button type="button" className="text-button" onClick={() => { setPhoto(''); setSavePhoto(false) }}>Remove photo</button></>}</details>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button type="submit" className="button primary" disabled={busy}><Icon name="check" size={17} />{product ? 'Save changes' : 'Add to my bag'}</button></div>
  </form>
}
