"""Production-only PWA/offline check. Build and run npm run preview first."""
import os
from playwright.sync_api import sync_playwright, expect
URL = os.environ.get('APP_URL', 'http://127.0.0.1:4173/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844})
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.goto(URL,wait_until='networkidle')
    page.get_by_role('heading',name='Fresh looks.',exact=False).wait_for(state='visible')
    page.evaluate('async () => { await navigator.serviceWorker.ready }')
    page.get_by_role('button',name='Or, try a sample makeup bag',exact=False).click()
    page.reload(wait_until='networkidle')
    assert page.evaluate('!!navigator.serviceWorker.controller')
    manifest=page.evaluate('async () => (await fetch("/manifest.webmanifest")).json()')
    assert manifest['display']=='standalone' and len(manifest['icons'])==2
    context.set_offline(True)
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('heading',name='My makeup bag.',exact=True)).to_be_visible()
    page.get_by_role('navigation',name='Mobile navigation').get_by_role('button',name='Create Look').click()
    page.get_by_role('button',name='Create my look',exact=True).click()
    expect(page.get_by_role('button',name='Follow along',exact=True)).to_be_visible()
    assert not errors,errors
    print('PASS production PWA: service worker, manifest/icons, offline reload, persisted bag, offline look generation')
    browser.close()
