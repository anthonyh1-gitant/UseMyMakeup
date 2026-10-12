import { useState } from 'react'
import { categories, type Category, type Product, type Preferences } from '../model'
import { visualReferences, type VisualReference } from '../visual'
import { Icon } from '../components/Icon'
import { Portrait } from '../components/Portrait'
import { Modal } from '../components/Modal'
export function Create({ products, onGenerate, onAdd }: { products: Product[]; onGenerate: (preferences: Preferences, referenceId: string, confirmed: Category[]) => void; onAdd: () => void }) {
  const [occasion, setOccasion] = useState('Everyday')
  const [variant, setVariant] = useState(0)
  const [time, setTime] = useState<5 | 10 | 20>(5)
  const [matching, setMatching] = useState(false)
  const [selected, setSelected] = useState<Category[]>(() => [...new Set(products.filter(p => p.available && !p.sample && p.category !== 'tools').map(p => p.category))])
  const [error, setError] = useState('')
  const references = visualReferences.filter(r => r.occasion === occasion)
  const reference = references[variant % references.length]
  function openMatch(look: VisualReference) {
    setVariant(references.findIndex(r => r.id === look.id))
    // Previously confirmed products are selected; a new user must tap what they own.
    setSelected([...new Set(products.filter(p => p.available && !p.sample && p.category !== 'tools').map(p => p.category))])
    setError(''); setMatching(true)
  }
  function submit() {
    if (!selected.length) { setError('Tap at least one makeup product you own. One is enough.'); return }
    onGenerate({ occasion, customOccasion: '', time, style: reference.style, skill: 'beginner', selectedIds: [], noFoundation: false, focusEyes: false }, reference.id, selected)
  }
  const chips = [...categories].filter(c => c.id !== 'tools').sort((a, b) => Number(reference.categories.includes(b.id)) - Number(reference.categories.includes(a.id)))
  return <div className="visual-create">
    <div className="page-heading visual-heading"><div><p className="eyebrow">A little inspiration. A lot less effort.</p><h1>A look for your moment<span className="heading-dot">.</span></h1><p className="muted">Pick your occasion. See a look. Make it yours.</p></div><span className="tag">Free · No selfie needed</span></div>
    <div className="occasion-strip" aria-label="Choose your occasion">{['Everyday', 'Work', 'Dinner', 'Celebration'].map(value => <button className={`occasion-pill ${occasion === value ? 'selected' : ''}`} key={value} aria-pressed={occasion === value} onClick={() => { setOccasion(value); setVariant(0) }}>{value === 'Everyday' ? <Icon name="sun" size={17} /> : value === 'Work' ? <Icon name="bag" size={17} /> : value === 'Dinner' ? <Icon name="moon" size={17} /> : <Icon name="sparkles" size={17} />}{value}</button>)}</div>
    <section className="inspiration-card" aria-labelledby="inspiration-name"><div className="inspiration-photo"><Portrait tile={reference.portrait} /><span className="image-source-badge">AI-generated style inspiration</span></div><div className="inspiration-copy"><p className="eyebrow">THE {occasion.toUpperCase()} EDIT</p><h2 id="inspiration-name">{reference.name}</h2><p className="inspiration-description">{reference.description}</p><div className="inspiration-meta"><span><Icon name="clock" size={16} /> About {time} min</span><span>{reference.categories.length} simple touches</span></div><div className="reference-products"><p className="small muted">The idea: a little of these.</p><div>{reference.categories.map(category => <span key={category}><i style={{ background: categories.find(c => c.id === category)!.color }} />{categories.find(c => c.id === category)!.short}</span>)}</div><p className="small muted">Missing something? We’ll adapt the steps to your bag.</p></div><button className="button primary try-look" onClick={() => openMatch(reference)}>Try this look <Icon name="arrow" size={18} /></button><button className="text-button another-look" onClick={() => setVariant(old => (old + 1) % references.length)}>Show another <Icon name="sparkles" size={16} /></button><details className="quick-adjustments"><summary>More or less time? <span>optional</span></summary><div className="choice-row">{([5, 10, 20] as const).map(minutes => <button type="button" key={minutes} className={`choice ${time === minutes ? 'selected' : ''}`} aria-pressed={time === minutes} onClick={() => setTime(minutes)}>{minutes} min</button>)}</div></details><p className="image-explanation">A reference on a model, not a prediction of your result. Colours and finishes are illustrative, not a match to your products.</p></div></section>
    <div className="visual-journey">{[['01', 'Pick a moment', 'An occasion, not a questionnaire.'], ['02', 'Use what you have', 'Quick taps. No brands or shades needed.'], ['03', 'Make it yours', 'A few easy steps, at your pace.']].map(([number,title,detail]) => <div key={number}><span>{number}</span><div><h3>{title}</h3><p>{detail}</p></div></div>)}</div>
    {matching && <Modal title="What do you have?" onClose={() => setMatching(false)} wide><div className="quick-match"><p>Tap what you own. Just one product is enough.</p><p className="small muted">No names, brands, shades or photos required. We’ll remember your choices.</p><div className="quick-product-grid">{chips.map(category => <button type="button" key={category.id} aria-pressed={selected.includes(category.id)} className={`quick-product ${selected.includes(category.id) ? 'selected' : ''}`} onClick={() => { setSelected(old => old.includes(category.id) ? old.filter(c => c !== category.id) : [...old, category.id]); setError('') }}><span className="quick-swatch" style={{ background: category.color }} /><span>{category.name}</span>{selected.includes(category.id) ? <Icon name="check" size={17} /> : <Icon name="plus" size={17} />}</button>)}</div>{error && <p className="notice error" role="alert">{error}</p>}<button className="button primary quick-match-cta" onClick={submit}>Use my products <Icon name="arrow" size={18} /></button><div className="quick-match-footer"><span>Your choices stay on this device.</span><button className="text-button" onClick={() => { setMatching(false); onAdd() }}>Add product details instead</button></div></div></Modal>}
  </div>
}
