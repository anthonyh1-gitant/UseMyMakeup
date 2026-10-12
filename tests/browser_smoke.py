"""Real visual-first browser journeys. Start dev/preview first; fresh contexts only."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
URL = os.environ.get('APP_URL', 'http://127.0.0.1:5173/')
KEY = 'use-my-makeup:v1'
OUTPUT = Path('/workspace/.setup/usemymakeup')
OUTPUT.mkdir(parents=True,exist_ok=True)
NAMES={'base':'Foundation / tint','concealer':'Concealer','powder':'Powder','blush':'Blush','bronzer':'Bronzer','eyeshadow':'Eyeshadow','eyeliner':'Eyeliner','mascara':'Mascara','lip':'Lip product'}
def nav(page,name):
    page.get_by_role('navigation',name='Mobile navigation' if page.viewport_size['width']<960 else 'Main navigation',exact=True).get_by_role('button',name=name,exact=False).click()
def state(page): return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
def no_overflow(page): assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Horizontal overflow'
def check_image(page,selector='.look-portrait:not(.compact) img'):
    image=page.locator(selector).first
    expect(image).to_be_visible()
    expect(image).to_have_js_property('complete',True)
    assert image.evaluate('(img)=>img.naturalWidth>0'),'Image did not decode'
def choose(page,categories):
    page.get_by_role('button',name='Try this look',exact=True).click()
    dialog=page.get_by_role('dialog')
    assert dialog.locator('input,select,textarea').count()==0
    for category in categories:
        button=dialog.get_by_role('button',name=NAMES[category],exact=True)
        if button.get_attribute('aria-pressed')!='true': button.click()
    dialog.get_by_role('button',name='Use my products',exact=True).click()
    expect(page.get_by_role('button',name='Follow along',exact=True)).to_be_visible()
def journey(browser,width,theme):
    context=browser.new_context(viewport={'width':width,'height':900},color_scheme=theme,reduced_motion='reduce')
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto(URL,wait_until='networkidle')
    expect(page.get_by_role('heading',name='A look for your moment.',exact=True)).to_be_visible()
    assert page.locator('input,select,textarea').count()==0
    check_image(page,'.inspiration-photo img'); no_overflow(page)
    page.screenshot(path=str(OUTPUT/f'visual-gallery-{width}-{theme}.png'),full_page=True)
    for occasion in ('Work','Celebration','Everyday','Dinner'):
        page.get_by_role('button',name=occasion,exact=True).click()
        before=page.locator('#inspiration-name').inner_text()
        page.get_by_role('button',name='Show another',exact=True).click()
        assert page.locator('#inspiration-name').inner_text()!=before
        page.get_by_role('button',name='Show another',exact=True).click()
    # Confirm empty selections don't invent ownership.
    page.get_by_role('button',name='Try this look',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Use my products',exact=True).click()
    expect(page.get_by_role('dialog').get_by_role('alert')).to_contain_text('Tap at least one')
    page.get_by_role('dialog').get_by_role('button',name='Close dialog').click()
    # Only three taps for products; no brand, shade, selfie, skill or product form.
    choose(page,['blush','mascara','lip'])
    data=state(page); look=data['current']
    assert len(data['products'])==3 and all(not p['sample'] and not p['brand'] and not p['name'] for p in data['products'])
    assert {s['category'] for s in look['steps']}=={'blush','mascara','lip'}
    assert sum(s['seconds'] for s in look['steps'])<=300
    assert look['referenceId']=='dinner-soft'
    check_image(page); no_overflow(page)
    page.screenshot(path=str(OUTPUT/f'visual-recipe-{width}-{theme}.png'),full_page=True)
    page.get_by_role('button',name='Save this look',exact=True).click()
    page.get_by_role('button',name='Rename look',exact=True).click()
    page.get_by_label('Look name',exact=True).fill('My dinner favourite')
    page.get_by_role('button',name='Done',exact=True).click()
    page.get_by_role('button',name='Follow along',exact=True).click()
    expect(page.get_by_text('Step 1 of',exact=False)).to_be_visible()
    check_image(page,'.look-portrait.compact img')
    page.get_by_text('What does this mean?',exact=True).click()
    page.get_by_role('button',name='Next step',exact=True).click()
    page.reload(wait_until='networkidle')
    expect(page.get_by_text('Step 2 of',exact=False)).to_be_visible()
    page.get_by_role('button',name='Back',exact=True).click()
    page.get_by_role('button',name='Skip this step',exact=True).click()
    assert len(state(page)['session']['skipped'])==1
    while page.get_by_role('button',name='Next step',exact=True).count(): page.get_by_role('button',name='Next step',exact=True).click()
    page.get_by_role('button',name='Finish look',exact=True).click()
    page.get_by_role('button',name='I tried this',exact=True).click()
    page.get_by_label('A note for next time',exact=False).fill('PRIVATE NOTE DO NOT EXPORT')
    page.get_by_role('button',name='ease: 4 of 5',exact=True).click()
    page.get_by_role('button',name='usefulness: 5 of 5',exact=True).click()
    page.get_by_role('button',name='Maybe',exact=True).click()
    page.get_by_role('button',name='Save feedback locally',exact=True).click()
    assert state(page)['saved'][0]['tried'] and state(page)['saved'][0]['ease']==4
    nav(page,'Settings'); page.get_by_role('button',name=theme,exact=True).click()
    page.get_by_label('Record anonymous journey events locally',exact=False).check()
    page.reload(wait_until='networkidle'); assert state(page)['theme']==theme
    # Returning users have their actual categories checked and no duplicate products.
    nav(page,'Create Look'); page.get_by_role('button',name='Try this look',exact=True).click()
    dialog=page.get_by_role('dialog')
    assert sum(b.get_attribute('aria-pressed')=='true' for b in dialog.locator('.quick-product').all())==3
    dialog.get_by_role('button',name='Use my products',exact=True).click()
    expect(page.get_by_role('button',name='Follow along',exact=True)).to_be_visible()
    assert len(state(page)['products'])==3
    # Manual details remain optional and editing/filtering still work.
    nav(page,'My Bag'); page.get_by_role('button',name='Edit Blush',exact=True).click()
    dialog=page.get_by_role('dialog'); dialog.get_by_label('Product name',exact=False).fill('Everyday blush')
    dialog.get_by_label('Brand',exact=False).fill('My brand'); dialog.get_by_role('button',name='Save changes',exact=True).click()
    page.get_by_label('Search products',exact=True).fill('mascara'); assert page.locator('.product-card').count()==1
    page.get_by_label('Search products',exact=True).fill(''); page.reload(wait_until='networkidle')
    assert any(p['brand']=='My brand' for p in state(page)['products'])
    # Deleting an item preserves saved IDs, flags the step and blocks its use.
    original=state(page)['saved'][0]
    first=next(p for p in state(page)['products'] if p['id']==original['productIds'][0])
    name=first['name'] or NAMES[first['category']]
    page.get_by_role('button',name=f'Delete {name}',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Delete permanently',exact=True).click()
    nav(page,'Saved'); expect(page.get_by_text('1 product missing / unavailable',exact=True)).to_be_visible()
    page.get_by_role('button',name='Recreate this look',exact=True).click()
    assert state(page)['current']['productIds']==original['productIds']
    page.get_by_role('button',name='Follow along',exact=True).click()
    expect(page.get_by_role('button',name='Next step',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Skip this step',exact=True).click()
    # Single-product image and recipe are both adapted, not a full-face reference.
    nav(page,'My Bag')
    for p in state(page)['products']:
        if p['category']!='lip': page.get_by_role('button',name=f"{p['name'] or NAMES[p['category']]}: available. Toggle availability",exact=True).click()
    nav(page,'Create Look'); choose(page,[])
    assert [s['category'] for s in state(page)['current']['steps']]==['lip']
    check_image(page)
    assert page.locator('.look-portrait img').first.get_attribute('src').endswith('minimal-models.png')
    page.get_by_role('button',name='Make it simpler',exact=True).click()
    assert state(page)['current']['preferences']['time']==5
    nav(page,'Settings')
    with page.expect_download() as download: page.get_by_role('button',name='Export local journey events',exact=True).click()
    exported=Path(download.value.path()).read_text(); assert 'PRIVATE NOTE' not in exported and 'My brand' not in exported and 'data:image' not in exported
    page.get_by_label('Record anonymous journey events locally',exact=False).uncheck(); assert state(page)['events']==[]
    page.get_by_role('button',name='Delete all my data',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Delete permanently',exact=True).click()
    expect(page.get_by_role('heading',name='A look for your moment.',exact=True)).to_be_visible()
    assert page.evaluate('(key)=>localStorage.getItem(key)',KEY) is None
    page.reload(wait_until='networkidle'); assert state(page)['products']==[]
    assert not errors,errors
    context.close(); print(f'PASS visual-first journey: {width}px / {theme}',flush=True)
def edges(browser):
    context=browser.new_context(viewport={'width':390,'height':900}); page=context.new_page()
    page.goto(URL,wait_until='networkidle'); choose(page,['blush'])
    nav(page,'My Bag'); page.get_by_role('button',name='Edit Blush',exact=True).click()
    dialog=page.get_by_role('dialog'); dialog.get_by_role('button',name='Lips',exact=True).click()
    dialog.get_by_role('button',name='Save changes',exact=True).click()
    # Existing recipe category correction must not silently reuse old instructions.
    nav(page,'Create Look'); choose(page,[])
    page.get_by_role('button',name='Save this look',exact=True).click()
    nav(page,'My Bag'); page.get_by_role('button',name='Edit Lip product',exact=True).click()
    dialog=page.get_by_role('dialog'); dialog.get_by_role('button',name='Blush',exact=True).click()
    dialog.get_by_role('button',name='Save changes',exact=True).click()
    nav(page,'Saved'); page.get_by_role('button',name='Recreate this look',exact=True).click()
    expect(page.get_by_text('This product is missing, unavailable, or its category has changed.',exact=False)).to_be_visible()
    nav(page,'My Bag'); page.get_by_role('button',name='Add a product',exact=True).click()
    dialog=page.get_by_role('dialog'); dialog.get_by_text('Add a product photo',exact=False).click()
    dialog.locator('input[type=file]').set_input_files({'name':'bad.txt','mimeType':'text/plain','buffer':b'not an image'})
    expect(dialog.get_by_role('alert')).to_contain_text('JPEG, PNG or WebP')
    dialog.locator('input[type=file]').set_input_files({'name':'huge.png','mimeType':'image/png','buffer':b'0'*(5*1024*1024+1)})
    expect(dialog.get_by_role('alert')).to_contain_text('too large')
    dialog.locator('input[type=file]').set_input_files(str(Path('public/icon-192.png').resolve()))
    expect(dialog.get_by_label('Save this photo on this device',exact=True)).not_to_be_checked()
    dialog.get_by_label('Product name',exact=False).fill('Optional photo')
    dialog.get_by_role('button',name='Add to my bag',exact=True).click(); assert not state(page)['products'][-1].get('photo')
    page.get_by_role('button',name='Edit Optional photo',exact=True).click(); dialog=page.get_by_role('dialog')
    dialog.get_by_text('Add a product photo',exact=False).click()
    dialog.locator('input[type=file]').set_input_files(str(Path('public/icon-192.png').resolve()))
    dialog.get_by_label('Save this photo on this device',exact=True).check()
    dialog.get_by_role('button',name='Save changes',exact=True).click()
    page.reload(wait_until='networkidle'); assert state(page)['products'][-1]['photo'].startswith('data:image/jpeg')
    page.get_by_role('button',name='Edit Optional photo',exact=True).click(); dialog=page.get_by_role('dialog')
    dialog.get_by_text('Add a product photo',exact=False).click(); dialog.get_by_role('button',name='Remove photo',exact=True).click()
    dialog.get_by_role('button',name='Save changes',exact=True).click(); assert not state(page)['products'][-1].get('photo')
    page.evaluate('(key)=>localStorage.setItem(key,"{broken")',KEY); page.reload(wait_until='networkidle')
    expect(page.get_by_role('alert')).to_contain_text('has not been overwritten'); assert page.evaluate('(key)=>localStorage.getItem(key)',KEY)=='{broken'
    page.get_by_role('button',name='Open storage settings',exact=True).click()
    page.get_by_role('button',name='Delete all my data',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Delete permanently',exact=True).click()
    choose(page,['lip']); assert len(state(page)['products'])==1
    context.close()
    # Missing image assets retain working recipes and clear image-unavailable text.
    context=browser.new_context(service_workers='block'); page=context.new_page()
    page.route('**/looks/*.png',lambda route:route.abort())
    page.goto(URL,wait_until='networkidle'); choose(page,['mascara','lip'])
    expect(page.get_by_text('A matching model image isn’t available',exact=False)).to_be_visible()
    page.get_by_role('button',name='Follow along',exact=True).click(); expect(page.get_by_text('Step 1 of',exact=False)).to_be_visible()
    context.close()
    # Storage-full warnings do not prevent an in-memory look.
    context=browser.new_context(); page=context.new_page()
    page.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}")
    page.goto(URL,wait_until='networkidle'); expect(page.get_by_role('alert')).to_contain_text('only in memory')
    choose(page,['lip']); context.close()
    print('PASS edges: category correction, photo consent/deletion, corrupt/full storage, image failure',flush=True)
def accessibility(browser):
    for width in (320,768):
        context=browser.new_context(viewport={'width':width,'height':900},color_scheme='light'); page=context.new_page()
        page.goto(URL,wait_until='networkidle'); no_overflow(page)
        page.emulate_media(color_scheme='dark',reduced_motion='reduce')
        assert page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()')=='#201e24'
        page.get_by_role('button',name='Try this look',exact=True).click(); dialog=page.get_by_role('dialog')
        for key in ('Tab','Shift+Tab'):
            for _ in range(20): page.keyboard.press(key); assert page.evaluate('!!document.activeElement.closest("dialog")')
        page.keyboard.press('Escape'); expect(dialog).not_to_be_visible(); no_overflow(page)
        context.close(); print(f'PASS accessibility: {width}px system theme, reduced motion, focus/Escape',flush=True)
def live_fallback(browser):
    context=browser.new_context(); page=context.new_page()
    page.route('**/api/image-status',lambda route:route.fulfill(json={'available':True}))
    calls=[]
    def failed_request(route):
        calls.append(route.request.post_data_json)
        route.fulfill(status=502,json={'error':'Provider unavailable'})
    page.route('**/api/look-image',failed_request)
    page.goto(URL,wait_until='networkidle'); choose(page,['eyeliner','lip'])
    expect(page.get_by_text('An image for this combination is not in the reference library yet.',exact=False)).to_be_visible()
    page.get_by_role('button',name='Generate a fresh reference',exact=True).click()
    expect(page.get_by_text('Live images aren’t available. Your recipe is still ready.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Generate a fresh reference',exact=True).click()
    page.wait_for_function('true'); expect(page.get_by_text('Live images aren’t available. Your recipe is still ready.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Follow along',exact=True).click(); expect(page.get_by_text('Step 1 of',exact=False)).to_be_visible()
    assert len(calls)==2
    assert all(set(call)=={'referenceId','categories'} for call in calls)
    assert all(set(call['categories'])=={'eyeliner','lip'} for call in calls)
    context.close(); print('PASS live-image provider failure/retry: recipe preserved, minimal private-free request',flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    scope=os.environ.get('SMOKE_SCOPE','all')
    if scope=='all':
        for width in (1440,390):
            for theme in ('light','dark'): journey(browser,width,theme)
    if scope in ('all','edges'): edges(browser); live_fallback(browser)
    if scope in ('all','accessibility'): accessibility(browser)
    browser.close()
