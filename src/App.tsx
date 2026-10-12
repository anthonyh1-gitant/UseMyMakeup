import { useEffect, useRef, useState } from 'react'
import { type AppState, type Look, type Page, type Preferences, type Product, type Session, type Theme, initialState, sampleBag, productName } from './model'
import { generateLook, missingProducts } from './engine'
import { loadState, persistState, STORAGE_KEY } from './storage'
import { Icon, ProductArt, type IconName } from './components/Icon'
import { Modal } from './components/Modal'
import { ProductForm } from './components/ProductForm'
import { Bag } from './pages/Bag'
import { Create } from './pages/Create'
import { LookPage, Follow } from './pages/Look'
import { Saved } from './pages/Saved'
import { Settings } from './pages/Settings'
import './App.css'
const navigation: { page: Page; label: string; icon: IconName }[] = [{ page: 'bag', label: 'My Bag', icon: 'bag' }, { page: 'create', label: 'Create Look', icon: 'sparkles' }, { page: 'saved', label: 'Saved', icon: 'heart' }, { page: 'settings', label: 'Settings', icon: 'settings' }]
const eventNames = ['onboarding_completed', 'product_added', 'first_look_created', 'follow_along_started', 'follow_along_completed', 'look_tried', 'second_look_created', 'pricing_interest', 'feedback_submitted']
function event(state: AppState, name: string, value?: string): AppState {
  if (!state.analyticsConsent || !eventNames.includes(name)) return state
  return { ...state, events: [...state.events.slice(-499), { name, at: new Date().toISOString(), ...(value ? { value } : {}) }] }
}
function hashPage(): Page {
  const hash = window.location.hash.slice(1)
  return ['bag', 'create', 'saved', 'settings', 'look', 'follow'].includes(hash) ? hash as Page : 'bag'
}
function App() {
  const [boot] = useState(loadState)
  const [state, setState] = useState(boot.state)
  const [persistAllowed, setPersistAllowed] = useState(!boot.error)
  const [storageBlocked, setStorageBlocked] = useState(Boolean(boot.error))
  const [storageError, setStorageError] = useState(boot.error)
  const [page, setPage] = useState<Page>(hashPage)
  const [productModal, setProductModal] = useState<Product | 'new' | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => void } | null>(null)
  const [tutorial, setTutorial] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [createError, setCreateError] = useState('')
  const mainRef = useRef<HTMLElement>(null)
  function commit(update: (state: AppState) => AppState) { if (!storageBlocked) setPersistAllowed(true); setState(update) }
  function navigate(next: Page) { window.location.hash = next; setPage(next); setCreateError('') }
  useEffect(() => { const listener = () => { if (['bag', 'create', 'saved', 'settings', 'look', 'follow'].includes(window.location.hash.slice(1))) setPage(hashPage()) }; window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener) }, [])
  useEffect(() => {
    let active = true
    if (persistAllowed) void persistState(state).then(error => { if (active) setStorageError(error) })
    return () => { active = false }
  }, [state, persistAllowed])
  useEffect(() => { document.documentElement.dataset.theme = state.theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#201e24' : '#faf8f5') }, [state.theme])
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }) }, [page, state.onboarded])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3500); return () => window.clearTimeout(timer) }, [toast])
  function startOnboarding(sample = false) {
    commit(old => event({ ...old, onboarded: true, products: sample ? [...old.products, ...(old.products.some(p => p.sample) ? [] : sampleBag())] : old.products }, 'onboarding_completed'))
    navigate('bag')
    if (sample) setToast('Demo bag added. Every sample product is labelled.')
    else setProductModal('new')
  }
  function saveProduct(product: Product) {
    commit(old => {
      const exists = old.products.some(p => p.id === product.id)
      const next = { ...old, products: exists ? old.products.map(p => p.id === product.id ? product : p) : [...old.products, product] }
      return exists ? next : event(next, 'product_added')
    })
    setProductModal(null); setToast('Product saved to your bag.')
  }
  function create(prefs: Preferences, templateId?: string) {
    try {
      const look = generateLook(state.products, prefs, templateId)
      commit(old => {
        const next = { ...old, current: look, session: null, lookCount: old.lookCount + 1 }
        return next.lookCount <= 2 ? event(next, next.lookCount === 1 ? 'first_look_created' : 'second_look_created') : next
      })
      navigate('look'); setToast('A fresh look, using only your selected products.')
    } catch (error) { setCreateError(error instanceof Error ? error.message : 'We couldn’t create this look. Your bag is safe. Please try again.') }
  }
  function changeLook(patch: Partial<Look>) {
    commit(old => {
      if (!old.current) return old
      const updated = { ...old.current, ...patch }
      const saved = old.saved.some(l => l.id === updated.id) ? old.saved.map(l => l.id === updated.id ? updated : l) : patch.tried ? [...old.saved, updated] : old.saved
      let next: AppState = { ...old, current: updated, saved }
      if (patch.tried && !old.current.tried) next = event(next, 'look_tried')
      if (patch.pricing && patch.pricing !== old.current.pricing) next = event(next, 'pricing_interest', patch.pricing)
      return next
    })
  }
  function saveCurrent() {
    commit(old => old.current ? { ...old, saved: old.saved.some(l => l.id === old.current!.id) ? old.saved : [...old.saved, old.current] } : old)
    setToast('Look saved. Find it in Saved whenever you like.')
  }
  function follow() {
    if (!state.current) return
    const current = state.current
    commit(old => event({ ...old, session: old.session?.lookId === current.id && !old.session.completed ? old.session : { lookId: current.id, index: 0, skipped: [], completed: false } }, 'follow_along_started'))
    navigate('follow')
  }
  function finish() {
    commit(old => event(old, 'follow_along_completed'))
    navigate('look'); setToast('You made it yours. Mark “I tried this” to record how it felt.')
  }
  function deleteData() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setPersistAllowed(false); setStorageBlocked(false); setStorageError(''); setState(initialState()); setConfirm(null); setTutorial(null); navigate('bag'); setToast('All your app data has been removed from this browser.')
    } catch { setStorageError('Browser storage could not be cleared. You can delete this site’s data in your browser settings.'); setConfirm(null) }
  }
  const activeNav = page === 'look' || page === 'follow' ? 'create' : page
  const current = state.current
  const showFollow = page === 'follow' && current && state.session?.lookId === current.id && !state.session.completed
  const changeTheme = (theme: Theme) => commit(old => ({ ...old, theme }))
  return <div className={`app-shell ${!state.onboarded ? 'is-welcome' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="desktop-sidebar"><button className="brand" onClick={() => navigate('bag')} aria-label="Use My Makeup home"><span className="brand-emblem"><Icon name="sparkles" size={22} /></span><span>use my<br /><em>makeup.</em></span></button><p className="brand-caption">A little inspiration.<br />Already in your bag.</p><nav aria-label="Main navigation">{navigation.map(item => <button key={item.page} className={`nav-item ${activeNav === item.page ? 'active' : ''}`} aria-current={activeNav === item.page ? 'page' : undefined} onClick={() => { if (!state.onboarded) commit(old => ({ ...old, onboarded: true })); navigate(item.page) }}><Icon name={item.icon} size={21} />{item.label}{item.page === 'saved' && state.saved.length > 0 && <span className="nav-count">{state.saved.length}</span>}</button>)}</nav><div className="sidebar-bottom"><Icon name="leaf" size={25} /><p>More possibilities.<br />Not more products.</p><span>THE FREE BETA</span></div></aside>
    <div className="app-column"><header className="topbar"><button className="mobile-brand" onClick={() => navigate('bag')}>use my <em>makeup.</em></button><div className="breadcrumb"><span>Your little beauty space</span><Icon name="chevron" size={13} /><strong>{!state.onboarded ? 'Welcome' : navigation.find(n => n.page === activeNav)?.label}</strong></div><div className="topbar-right"><span className="local-status"><i /> On this device</span><button className="icon-button theme-toggle" aria-label={`Appearance: ${state.theme}. Switch to ${state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'system' : 'light'}`} onClick={() => changeTheme(state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'system' : 'light')}><Icon name={state.theme === 'light' ? 'sun' : state.theme === 'dark' ? 'moon' : 'monitor'} size={19} /></button></div></header>
      <main id="main-content" className="app-main" tabIndex={-1} ref={mainRef}>
        {storageError && <div className="notice error" role="alert">{storageError}<button className="text-button" onClick={() => { commit(old => ({ ...old, onboarded: true })); navigate('settings') }}>Open storage settings</button></div>}
        {!state.onboarded ? <div className="welcome-page"><div className="welcome-copy"><span className="welcome-pill"><Icon name="leaf" size={15} /> A little less buying. A little more you.</span><p className="eyebrow">MEET YOUR MAKEUP, AGAIN.</p><h1>Fresh looks.<br />Using what you<br /><em>already own.</em></h1><p className="welcome-description">A look for your day, made from your makeup bag.<br className="desktop-only" /> Simple steps. A little confidence. All you.</p><button className="button primary welcome-cta" onClick={() => startOnboarding()}>Create my first look <Icon name="arrow" size={19} /></button><button className="welcome-sample text-button" onClick={() => startOnboarding(true)}>Or, try a sample makeup bag <Icon name="chevron" size={15} /></button><p className="small muted">No account needed · Free beta · Your data stays here</p></div><div className="welcome-display" aria-hidden="true"><div className="display-circle" /><div className="display-label">THE EVERYDAY EDIT</div><div className="display-product display-blush"><ProductArt product={{ category: 'blush' }} large /><span>a little colour</span></div><div className="display-product display-lip"><ProductArt product={{ category: 'lip' }} large /><span>your favourite lip</span></div><div className="display-product display-mascara"><ProductArt product={{ category: 'mascara' }} large /><span>one simple coat</span></div><div className="display-note"><Icon name="sparkles" size={22} /><span>Good things are<br /><em>already in your bag.</em></span></div><span className="display-caption">PRODUCT ILLUSTRATIONS · NOT RECOMMENDATIONS</span></div><div className="welcome-steps">{[['01', 'Add your products.', 'A few favourites are enough.'], ['02', 'Pick your occasion.', 'Your time. Your kind of look.'], ['03', 'Follow your look.', 'Clear steps, at your own pace.']].map(([number, title, caption]) => <div key={number}><span>{number}</span><div><h2>{title}</h2><p>{caption}</p></div></div>)}</div></div> : <>
          {createError && <div className="notice error" role="alert">{createError}</div>}
          {page === 'bag' && <Bag products={state.products} onAdd={() => setProductModal('new')} onEdit={setProductModal} onDelete={p => setConfirm({ title: 'Remove this product?', text: `${productName(p)} will be removed, including any saved photo. Saved looks that use it will show it as missing.`, action: () => { commit(old => ({ ...old, products: old.products.filter(item => item.id !== p.id) })); setConfirm(null); setToast('Product removed. Saved recipes remain unchanged.') } })} onToggle={id => commit(old => ({ ...old, products: old.products.map(p => p.id === id ? { ...p, available: !p.available } : p) }))} onCreate={() => navigate('create')} session={state.session} current={current} onResume={follow} />}
          {page === 'create' && <Create products={state.products} onGenerate={create} onAdd={() => setProductModal('new')} />}
          {page === 'saved' && <Saved looks={state.saved} products={state.products} onOpen={look => { commit(old => ({ ...old, current: look, session: old.session?.lookId === look.id ? old.session : null })); navigate('look') }} onDelete={look => setConfirm({ title: 'Delete this saved look?', text: 'This removes the saved recipe, ratings and private notes. Your makeup bag will stay as it is.', action: () => { commit(old => ({ ...old, saved: old.saved.filter(l => l.id !== look.id), current: old.current?.id === look.id ? null : old.current, session: old.session?.lookId === look.id ? null : old.session })); setConfirm(null); setToast('Saved look deleted.') } })} onCreate={() => navigate('create')} />}
          {page === 'settings' && <Settings state={state} onTheme={changeTheme} onConsent={consent => commit(old => ({ ...old, analyticsConsent: consent, events: consent ? old.events : [] }))} onTutorial={() => setTutorial(0)} onDelete={() => setConfirm({ title: 'Delete all your app data?', text: 'This permanently removes your products, photos, looks, notes, feedback, preferences and local events from this browser. Download a private backup first if you want to keep a copy.', action: deleteData })} onFeedbackChange={generalFeedback => commit(old => ({ ...old, generalFeedback }))} onFeedbackSave={() => commit(old => event(old, 'feedback_submitted'))} />}
          {page === 'look' && current && <LookPage key={current.id} look={current} products={state.products} isSaved={state.saved.some(l => l.id === current.id)} onChange={changeLook} onSave={saveCurrent} onFollow={follow} onSimplify={() => { if (missingProducts(current, state.products).length) { setCreateError('Some products are missing. Choose from your available bag in Create Look to make a simpler version.'); return } const prefs = { ...current.preferences, time: 5 as const, style: 'minimal' as const, skill: 'beginner' as const }; create(prefs) }} onCreate={() => navigate('create')} onFeedback={() => { saveCurrent(); commit(old => event(old, 'feedback_submitted')); setToast('Feedback saved locally. Nothing has been sent.') }} />}
          {showFollow && <Follow key={`${current.id}:${state.session!.index}`} look={current} products={state.products} session={state.session!} onSession={(session: Session) => commit(old => ({ ...old, session }))} onFull={() => navigate('look')} onFinish={finish} />}
          {(page === 'look' && !current || page === 'follow' && !showFollow) && <div className="empty-state"><Icon name="sparkles" size={38} /><h1>A fresh look starts here.</h1><p>Your bag is ready when you are.</p><button className="button primary" onClick={() => navigate('create')}>Create a look</button></div>}
        </>}
      </main><footer className="app-footer"><span>Fresh looks. Using what you already own.</span><span>Made for real life. <Icon name="leaf" size={13} /></span></footer>
    </div>
    {state.onboarded && <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(item => <button key={item.page} aria-current={activeNav === item.page ? 'page' : undefined} className={activeNav === item.page ? 'active' : ''} onClick={() => navigate(item.page)}><Icon name={item.icon} size={21} /><span>{item.label}</span></button>)}</nav>}
    {toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
    {productModal && <Modal title={productModal === 'new' ? 'A little addition to your bag' : 'Make it yours'} wide onClose={() => setProductModal(null)}><ProductForm product={productModal === 'new' ? undefined : productModal} onSave={saveProduct} onCancel={() => setProductModal(null)} /></Modal>}
    {confirm && <Modal title={confirm.title} onClose={() => setConfirm(null)}><p className="confirm-copy">{confirm.text}</p><div className="form-actions"><button className="button secondary" onClick={() => setConfirm(null)}>Keep it</button><button className="button danger" onClick={confirm.action}>Delete permanently</button></div></Modal>}
    {tutorial !== null && <Modal title="Three little steps" onClose={() => setTutorial(null)}><div className="walkthrough"><span className="walkthrough-number">0{tutorial + 1}</span><h3>{['Add your products.', 'Pick your occasion.', 'Follow your look.'][tutorial]}</h3><p>{['Start with one or two favourites. Choose a category; brand, shade and photo are optional. You can edit or remove products at any time.', 'Tell us your occasion, available time and preferred style. Uncheck any product you do not want to use. No selfie or new purchase is needed.', 'Follow one step at a time or read the full list. Progress saves automatically. Save your recipe, try it, and leave a private note for next time.'][tutorial]}</p><div className="walkthrough-dots">{[0, 1, 2].map(i => <span className={i === tutorial ? 'active' : ''} key={i} />)}</div><div className="form-actions"><button className="text-button" onClick={() => setTutorial(null)}>Skip tutorial</button><button className="button primary" onClick={() => tutorial === 2 ? setTutorial(null) : setTutorial(tutorial + 1)}>{tutorial === 2 ? 'Got it' : 'Next'}<Icon name="arrow" size={16} /></button></div></div></Modal>}
  </div>
}
export default App
