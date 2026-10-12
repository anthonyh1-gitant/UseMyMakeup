"""Real browser journey checks. Uses Python Playwright and system Chromium.
Run with the Vite dev server running: python3 tests/browser_smoke.py
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('APP_URL', 'http://127.0.0.1:5173/')
KEY = 'use-my-makeup:v1'
OUTPUT = Path('/workspace/.setup/usemymakeup')
OUTPUT.mkdir(parents=True, exist_ok=True)

def nav(page, name):
    page.get_by_role('navigation', name='Mobile navigation' if page.viewport_size['width'] < 960 else 'Main navigation', exact=True).get_by_role('button', name=name, exact=False).click()

def saved_state(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)

def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Page overflows horizontally'

def add_product(page, name, category='Blush'):
    page.get_by_role('button', name='Add a product', exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_role('button',name=category,exact=True).click()
    dialog.get_by_label('Product name',exact=False).fill(name)
    dialog.get_by_role('button',name='Add to my bag',exact=True).click()
    expect(dialog).not_to_be_visible()

def run_journey(browser, width, theme):
    context=browser.new_context(viewport={'width':width,'height':900},color_scheme=theme,reduced_motion='reduce')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    page.goto(URL,wait_until='networkidle')
    no_overflow(page)
    page.get_by_role('button',name='Create my first look',exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_label('Product name',exact=False).fill('My rose blush')
    dialog.get_by_label('Shade description',exact=False).fill('Muted rose')
    dialog.get_by_role('button',name='Add to my bag',exact=True).click()
    add_product(page,'My mascara','Mascara')
    add_product(page,'My favourite lip','Lips')
    assert len(saved_state(page)['products'])==3
    assert not any(p['sample'] for p in saved_state(page)['products'])
    # Edit and filter inventory, then confirm refresh persistence.
    page.get_by_role('button',name='Edit My rose blush',exact=True).click()
    page.get_by_role('dialog').get_by_label('Brand',exact=False).fill('My brand')
    page.get_by_role('dialog').get_by_label('Finish',exact=False).select_option('Satin')
    page.get_by_role('dialog').get_by_role('button',name='Save changes',exact=True).click()
    page.get_by_label('Search products',exact=True).fill('mascara')
    assert page.locator('.product-card').count()==1
    page.get_by_label('Search products',exact=True).fill('')
    page.reload(wait_until='networkidle')
    assert saved_state(page)['products'][0]['brand']=='My brand'
    # Use settings and verify the actual persisted theme, not just the control.
    nav(page,'Settings')
    page.get_by_role('button',name=theme,exact=True).click()
    assert page.locator('html').get_attribute('data-theme')==theme
    page.reload(wait_until='networkidle')
    assert saved_state(page)['theme']==theme
    page.get_by_label('Record anonymous journey events locally',exact=False).check()
    # Complete the core look journey.
    nav(page,'Create Look')
    page.get_by_role('button',name='Dinner',exact=True).click()
    page.get_by_role('button',name='5 min',exact=False).click()
    page.get_by_role('button',name='Create my look',exact=True).click()
    expect(page.get_by_role('button',name='Follow along',exact=True)).to_be_visible()
    current=saved_state(page)['current']
    assert all(s['productId'] in [p['id'] for p in saved_state(page)['products']] for s in current['steps'])
    assert sum(s['seconds'] for s in current['steps'])<=300
    assert not current['sample']
    no_overflow(page)
    page.screenshot(path=str(OUTPUT/f'look-{width}-{theme}.png'),full_page=True)
    page.get_by_role('button',name='Save this look',exact=True).click()
    page.get_by_role('button',name='Rename look',exact=True).click()
    page.get_by_label('Look name',exact=True).fill('My dinner favourite')
    page.get_by_role('button',name='Done',exact=True).click()
    page.get_by_role('button',name='Follow along',exact=True).click()
    expect(page.get_by_text('Step 1 of',exact=False)).to_be_visible()
    page.get_by_text('What does this mean?',exact=True).click()
    page.get_by_role('button',name='Next step',exact=True).click()
    page.reload(wait_until='networkidle')
    expect(page.get_by_text('Step 2 of',exact=False)).to_be_visible()
    page.get_by_role('button',name='Back',exact=True).click()
    expect(page.get_by_text('Step 1 of',exact=False)).to_be_visible()
    page.get_by_role('button',name='Skip this step',exact=True).click()
    assert len(saved_state(page)['session']['skipped'])==1
    while page.get_by_role('button',name='Next step',exact=True).count():
        page.get_by_role('button',name='Next step',exact=True).click()
    page.get_by_role('button',name='Finish look',exact=True).click()
    expect(page.get_by_role('button',name='I tried this',exact=True)).to_be_visible()
    page.get_by_role('button',name='I tried this',exact=True).click()
    page.get_by_label('A note for next time',exact=False).fill('PRIVATE NOTE DO NOT EXPORT')
    page.get_by_role('button',name='ease: 4 of 5',exact=True).click()
    page.get_by_role('button',name='usefulness: 5 of 5',exact=True).click()
    page.get_by_role('button',name='Yes',exact=True).click()
    page.get_by_role('button',name='Maybe',exact=True).click()
    page.get_by_role('button',name='Save feedback locally',exact=True).click()
    state=saved_state(page)
    assert state['saved'][0]['name']=='My dinner favourite'
    assert state['saved'][0]['tried'] and state['saved'][0]['ease']==4
    assert state['saved'][0]['usefulness']==5 and state['saved'][0]['privateNote']=='PRIVATE NOTE DO NOT EXPORT'
    assert state['session']['completed']
    # Deletion must flag missing products without mutating the saved recipe.
    original_ids=state['saved'][0]['productIds']
    nav(page,'My Bag')
    page.get_by_role('button',name='Delete My rose blush',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Delete permanently',exact=True).click()
    nav(page,'Saved')
    expect(page.get_by_text('1 product missing / unavailable',exact=True)).to_be_visible()
    page.get_by_role('button',name='Recreate this look',exact=True).click()
    assert saved_state(page)['current']['productIds']==original_ids
    expect(page.get_by_text('This saved recipe has not been changed.',exact=False)).to_be_visible()
    page.get_by_role('button',name='Follow along',exact=True).click()
    expect(page.get_by_role('button',name='Next step',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Skip this step',exact=True).click()
    # An available-product recreation, simpler variation and unavailable filtering.
    nav(page,'My Bag')
    page.get_by_role('button',name='My mascara: available. Toggle availability',exact=True).click()
    nav(page,'Create Look')
    expect(page.get_by_text('My mascara',exact=True)).not_to_be_visible()
    page.get_by_role('button',name='Create my look',exact=True).click()
    expect(page.get_by_role('button',name='Follow along',exact=True)).to_be_visible()
    assert len(saved_state(page)['current']['steps'])==1
    page.get_by_role('button',name='Make it simpler',exact=True).click()
    assert saved_state(page)['current']['preferences']['time']==5
    nav(page,'Settings')
    with page.expect_download() as download:
        page.get_by_role('button',name='Export local journey events',exact=True).click()
    data=Path(download.value.path()).read_text()
    assert 'PRIVATE NOTE' not in data and 'My brand' not in data and 'data:image' not in data
    assert 'pricing_interest' in data and 'follow_along_completed' in data
    page.get_by_label('Record anonymous journey events locally',exact=False).uncheck()
    assert saved_state(page)['events']==[]
    # Walkthrough is skippable; deletion is confirmed and resets every kind of app data.
    page.get_by_role('button',name='Show me around',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Skip tutorial',exact=True).click()
    page.get_by_role('button',name='Delete all my data',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Delete permanently',exact=True).click()
    expect(page.get_by_role('heading',name='Fresh looks.',exact=False)).to_be_visible()
    assert page.evaluate('(key) => localStorage.getItem(key)',KEY) is None
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('button',name='Create my first look',exact=True)).to_be_visible()
    assert not errors,errors
    context.close()
    print(f'PASS complete manual journey: {width}px / {theme}',flush=True)

def run_edge_cases(browser):
    context=browser.new_context(viewport={'width':390,'height':900})
    page=context.new_page()
    page.goto(URL,wait_until='networkidle')
    page.get_by_role('button',name='Or, try a sample makeup bag',exact=False).click()
    assert len(saved_state(page)['products'])==5
    assert all(p['sample'] for p in saved_state(page)['products'])
    nav(page,'Create Look')
    page.get_by_role('button',name='Create my look',exact=True).click()
    expect(page.get_by_role('button',name='Follow along',exact=True)).to_be_visible()
    assert saved_state(page)['current']['sample']
    expect(page.get_by_text('This look uses labelled demonstration products.',exact=False)).to_be_visible()
    # Changing a category must make the old instructions unavailable.
    page.get_by_role('button',name='Save this look',exact=True).click()
    nav(page,'My Bag')
    page.get_by_role('button',name='Edit Rose cream blush',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Lips',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Save changes',exact=True).click()
    nav(page,'Saved')
    page.get_by_role('button',name='Recreate this look',exact=True).click()
    expect(page.get_by_text('This product is missing, unavailable, or its category has changed.',exact=False)).to_be_visible()
    # Empty selection is handled, no result is fabricated.
    nav(page,'Create Look')
    for checkbox in page.locator('.product-checklist input[type=checkbox]').all(): checkbox.uncheck()
    page.get_by_role('button',name='Create my look',exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Choose at least one')
    nav(page,'My Bag')
    page.get_by_role('button',name='Add a product',exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_text('Add a product photo',exact=False).click()
    dialog.locator('input[type=file]').set_input_files({'name':'bad.txt','mimeType':'text/plain','buffer':b'not a photo'})
    expect(dialog.get_by_role('alert')).to_contain_text('JPEG, PNG or WebP')
    dialog.locator('input[type=file]').set_input_files({'name':'huge.png','mimeType':'image/png','buffer':b'0'*(5*1024*1024+1)})
    expect(dialog.get_by_role('alert')).to_contain_text('too large')
    dialog.locator('input[type=file]').set_input_files(str(Path('public/icon-192.png').resolve()))
    expect(dialog.get_by_label('Save this photo on this device',exact=True)).not_to_be_checked()
    dialog.get_by_label('Product name',exact=False).fill('Photo is transient')
    dialog.get_by_role('button',name='Add to my bag',exact=True).click()
    assert not saved_state(page)['products'][-1].get('photo')
    page.get_by_role('button',name='Edit Photo is transient',exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_text('Add a product photo',exact=False).click()
    dialog.locator('input[type=file]').set_input_files(str(Path('public/icon-192.png').resolve()))
    dialog.get_by_label('Save this photo on this device',exact=True).check()
    dialog.get_by_role('button',name='Save changes',exact=True).click()
    assert saved_state(page)['products'][-1]['photo'].startswith('data:image/jpeg')
    page.reload(wait_until='networkidle')
    assert saved_state(page)['products'][-1]['photo'].startswith('data:image/jpeg')
    page.get_by_role('button',name='Edit Photo is transient',exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_text('Add a product photo',exact=False).click()
    dialog.get_by_role('button',name='Remove photo',exact=True).click()
    dialog.get_by_role('button',name='Save changes',exact=True).click()
    assert not saved_state(page)['products'][-1].get('photo')
    # Preserve malformed saved data rather than silently replacing it.
    page.evaluate('(key) => localStorage.setItem(key, "{broken")',KEY)
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('alert')).to_contain_text('has not been overwritten')
    assert page.evaluate('(key) => localStorage.getItem(key)',KEY)=='{broken'
    page.get_by_role('button',name='Open storage settings',exact=True).click()
    page.get_by_role('button',name='Delete all my data',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Delete permanently',exact=True).click()
    page.get_by_role('button',name='Create my first look',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Add to my bag',exact=True).click()
    assert len(saved_state(page)['products'])==1
    context.close()
    # A real write failure shows a storage warning; the in-memory app still works.
    context=browser.new_context()
    page=context.new_page()
    page.add_init_script("Storage.prototype.setItem = function() { throw new DOMException('full', 'QuotaExceededError') }")
    page.goto(URL,wait_until='networkidle')
    expect(page.get_by_role('alert')).to_contain_text('only in memory')
    page.get_by_role('button',name='Or, try a sample makeup bag',exact=False).click()
    expect(page.get_by_role('heading',name='My makeup bag.',exact=True)).to_be_visible()
    nav(page,'Create Look')
    page.get_by_role('button',name='Create my look',exact=True).click()
    expect(page.get_by_role('button',name='Follow along',exact=True)).to_be_visible()
    context.close()
    print('PASS edge cases: demo labels, category changes, exclusions, photo validation/consent/deletion, corrupt data, storage failure',flush=True)

def run_accessibility(browser):
    for width in (320,768):
        context=browser.new_context(viewport={'width':width,'height':900},color_scheme='light')
        page=context.new_page()
        page.goto(URL,wait_until='networkidle')
        no_overflow(page)
        assert page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()')=='#faf8f5'
        page.emulate_media(color_scheme='dark',reduced_motion='reduce')
        assert page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()')=='#201e24'
        page.get_by_role('button',name='Create my first look',exact=True).click()
        dialog=page.get_by_role('dialog')
        for key in ('Tab','Shift+Tab'):
            for _ in range(25):
                page.keyboard.press(key)
                assert page.evaluate('!!document.activeElement.closest("dialog")'), 'Focus escaped modal'
        page.keyboard.press('Escape')
        expect(dialog).not_to_be_visible()
        nav(page,'Create Look')
        page.get_by_role('button',name='Dinner',exact=True).click()
        page.get_by_role('button',name='20 min',exact=False).click()
        page.get_by_role('button',name='Add a product',exact=True).click()
        page.get_by_role('dialog').get_by_role('button',name='Add to my bag',exact=True).click()
        assert page.get_by_role('button',name='Dinner',exact=True).get_attribute('aria-pressed')=='true'
        assert page.get_by_role('button',name='20 min',exact=False).get_attribute('aria-pressed')=='true'
        no_overflow(page)
        print(f'PASS {width}px: system theme, reduced motion, keyboard focus/Escape, create-form preservation',flush=True)
        context.close()

with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    scope=os.environ.get('SMOKE_SCOPE','all')
    if scope=='all':
        for width in (1440,390):
            for theme in ('light','dark'): run_journey(browser,width,theme)
    if scope in ('all','edges'): run_edge_cases(browser)
    if scope in ('all','accessibility'): run_accessibility(browser)
    browser.close()
