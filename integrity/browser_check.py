#!/usr/bin/env python3
"""Headless qualification of the actual portable desktop and narrow interfaces."""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];network=[]
def check(label,condition):
 checks.append({'check':label,'pass':bool(condition)})
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--disable-gpu'])
 page=browser.new_page(viewport={'width':1460,'height':1040},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
 page.goto((a.bundle/'index.html').resolve().as_uri());page.wait_for_selector('.row')
 check('all_124_rows_render',page.locator('.row').count()==124)
 page.get_by_role('button',name='Neros 2024 listing',exact=True).click()
 check('neros_historical_scope',page.locator('.row').count()==1 and 'Historical roster' in page.locator('#detail').inner_text() and '2024' in page.locator('#detail').inner_text())
 page.get_by_role('button',name='X-Bow source conflict',exact=True).click()
 page.locator('#collection').select_option('Source reconciliation')
 check('xbow_exact_source_values','129,494,248' in page.locator('#detail').inner_text() and '121,494,248' in page.locator('#detail').inner_text() and '8,000,000' in page.locator('#detail').inner_text())
 page.screenshot(path=str(a.out/'desktop-xbow.png'),full_page=True)
 page.locator('#search').fill('Cambium');page.locator('#collection').select_option('Government awards')
 check('identity_hold_visible','Identity held' in page.locator('.row').inner_text() and 'held' in page.locator('#detail').inner_text())
 page.locator('#search').fill('Raft');page.locator('#collection').select_option('Government awards')
 check('raft_separate_rows',page.locator('.row').count()==2)
 page.locator('.row').nth(1).click();check('raft_unknown_obligation_visible','Not recorded' in page.locator('#detail').inner_text() and '349,000,000' in page.locator('#detail').inner_text())
 with page.expect_download() as dl:page.get_by_role('button',name='Export review inbox',exact=True).click()
 download=dl.value;download.save_as(str(a.out/'downloaded-inbox.jsonl'))
 check('download_complete_124_rows',len((a.out/'downloaded-inbox.jsonl').read_text().splitlines())==124)
 check('download_exact_source_bytes',(a.out/'downloaded-inbox.jsonl').read_bytes()==(a.bundle/'exports/review-inbox.jsonl').read_bytes())
 with page.expect_download() as dl:page.get_by_role('button',name='CSV',exact=True).click()
 dl.value.save_as(str(a.out/'downloaded.csv'))
 check('csv_exact_source_bytes',(a.out/'downloaded.csv').read_bytes()==(a.bundle/'exports/records.csv').read_bytes())
 page.get_by_role('button',name='Identity holds',exact=True).click()
 check('identity_hold_chip_exact',page.locator('.row').count()==1 and 'Cambium' in page.locator('.row').inner_text())
 with page.expect_download() as dl:page.get_by_role('button',name='Export this record',exact=True).click()
 download=dl.value;download.save_as(str(a.out/'downloaded-record.json'))
 check('record_export_preserves_hold',json.loads((a.out/'downloaded-record.json').read_text())['review_state']=='requires_independent_review')
 page.locator('#search').fill('Firestorm');page.locator('#collection').select_option('');page.locator('.row').first.click()
 bookmark=page.url;page.goto(bookmark);check('bookmark_reopens_same_record','Firestorm' in page.locator('#detail').inner_text())
 page.set_viewport_size({'width':390,'height':844});page.locator('#search').fill('Neros');page.locator('#collection').select_option('')
 check('narrow_no_horizontal_overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
 page.screenshot(path=str(a.out/'mobile-neros.png'),full_page=True)
 page.locator('#search').fill('no-record-928371');check('bounded_absence_visible','does not establish' in page.locator('#results').inner_text())
 check('no_unhandled_browser_errors',not errors);check('no_network_needed',not network)
 browser.close()
result={'status':'pass' if all(c['pass'] for c in checks) else 'fail','passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'network_requests':network,'browser':'Installed Chrome via Playwright, headless, separate temporary profile','scope':'Actual file:// desktop and narrow-layout interaction, source detail, download and bookmark; not human content review.'}
(a.out/'BROWSER.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));raise SystemExit(0 if result['status']=='pass' else 1)
