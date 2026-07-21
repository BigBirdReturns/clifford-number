#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'build', 'metrics');
const resultPath = path.join(outputDirectory, 'anduril-reporter-browser.json');
const caseScreenshot = path.join(outputDirectory, 'anduril-reporter-evidence.png');
const briefScreenshot = path.join(outputDirectory, 'anduril-reporter-brief.png');

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function waitForCase(page) {
  await page.waitForFunction(() => document.querySelector('#detail .case-hero h2')?.textContent?.includes('Anduril: Access, Ownership, and the Government Gate'), null, { timeout: 60000 });
  await settle(page);
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const output = {
    schema_version: 'clifford-anduril-reporter-browser@1',
    generated_at: new Date().toISOString(),
    graph_effect: 'none',
    conclusion_generated: false,
    passed: false,
    public_case: null,
    briefing: null,
    standalone_case: null,
    console_errors: [],
    page_errors: [],
    error: null,
    interpretation_contract: {
      what_this_is: 'A browser verification that the finite Anduril briefing reaches the compiled claim-and-receipt case and that the standalone retains the evidence case without a broken external briefing link.',
      what_this_is_not: 'A finding about Anduril, a causal assessment, an AI-generated score, or verification of facts beyond the cited public receipts.'
    }
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') output.console_errors.push({ text: message.text(), location: message.location() });
  });
  page.on('pageerror', error => output.page_errors.push({ message: error.message, stack: error.stack }));

  try {
    await page.goto('http://127.0.0.1:8080/#case/anduril-access-ownership', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForCase(page);

    const verifiedClaims = await page.locator('#detail .case-claim--verified').count();
    const reviewRequiredClaims = await page.locator('#detail .case-claim--review_required').count();
    const briefingLink = page.locator('#detail .case-brief-link');
    assert.equal(await briefingLink.count(), 1, 'the public case must expose one finite briefing link');
    assert.equal(await briefingLink.getAttribute('href'), 'briefs/anduril-access-ownership.html');
    assert.equal(verifiedClaims, 15);
    assert.equal(reviewRequiredClaims, 9);

    await page.locator('#detail .case-claim--verified .claim-open').first().click();
    await page.waitForSelector('#evidence-dialog[open] .claim-inspector', { timeout: 10000 });
    const claimStatus = await page.locator('#evidence-dialog .claim-status-line').textContent();
    const claimBoundary = await page.locator('#evidence-dialog .claim-boundary').textContent();
    const qualification = await page.locator('#evidence-dialog .evidence-note').first().textContent();
    const sourceLinks = page.locator('#evidence-dialog .receipt-link[href^="https://"]');
    assert.match(claimStatus ?? '', /Verified/i);
    assert.match(claimStatus ?? '', /Official/i);
    assert.match(claimBoundary ?? '', /does not establish intent, coordination, influence, benefit, wrongdoing, or causation/i);
    assert.ok((qualification ?? '').trim().length > 20, 'the opened claim must preserve its qualification');
    assert.ok(await sourceLinks.count() >= 1, 'a verified claim must expose at least one public source link');
    await page.screenshot({ path: caseScreenshot, fullPage: true });

    output.public_case = {
      verified_claims: verifiedClaims,
      review_required_claims: reviewRequiredClaims,
      briefing_href: await briefingLink.getAttribute('href'),
      evidence_dialog_opened: true,
      public_source_links_in_opened_claim: await sourceLinks.count(),
      qualification_visible: true,
      inference_boundary_visible: true
    };

    await page.locator('#evidence-dialog-close').click();
    await page.waitForFunction(() => !document.querySelector('#evidence-dialog')?.open);

    await page.goto('http://127.0.0.1:8080/briefs/anduril-access-ownership.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);
    assert.match(await page.locator('h1').textContent(), /Anduril: access, ownership, and the government gate/i);
    const caseCards = await page.locator('.cards .card').count();
    const indexedSourceLinks = await page.locator('.sources a[href^="https://"]').count();
    const caseReturnHref = await page.locator('a[href="../#case/anduril-access-ownership"]').getAttribute('href');
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(caseCards, 6);
    assert.ok(indexedSourceLinks >= 13);
    assert.equal(caseReturnHref, '../#case/anduril-access-ownership');
    assert.equal(desktopOverflow, false);
    await page.screenshot({ path: briefScreenshot, fullPage: true });

    await page.setViewportSize({ width: 375, height: 812 });
    await settle(page);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(mobileOverflow, false);
    output.briefing = {
      case_cards: caseCards,
      indexed_public_source_links: indexedSourceLinks,
      case_return_href: caseReturnHref,
      desktop_horizontal_overflow: desktopOverflow,
      mobile_horizontal_overflow: mobileOverflow
    };

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('http://127.0.0.1:8080/dist/Clifford-Number-standalone.html#case/anduril-access-ownership', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForCase(page);
    const standaloneVerified = await page.locator('#detail .case-claim--verified').count();
    const standaloneReview = await page.locator('#detail .case-claim--review_required').count();
    assert.equal(await page.locator('#detail .case-brief-link').count(), 0, 'the portable release must suppress the external briefing link');
    assert.equal(standaloneVerified, 15);
    assert.equal(standaloneReview, 9);
    await page.locator('#detail .case-claim--verified .claim-open').first().click();
    await page.waitForSelector('#evidence-dialog[open] .receipt-link[href^="https://"]', { timeout: 10000 });
    const standaloneSourceLinks = await page.locator('#evidence-dialog .receipt-link[href^="https://"]').count();
    assert.ok(standaloneSourceLinks >= 1);
    output.standalone_case = {
      verified_claims: standaloneVerified,
      review_required_claims: standaloneReview,
      external_briefing_link_suppressed: true,
      evidence_dialog_opened: true,
      public_source_links_in_opened_claim: standaloneSourceLinks
    };

    assert.deepEqual(output.console_errors, []);
    assert.deepEqual(output.page_errors, []);
    output.passed = true;
  } catch (error) {
    output.error = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    await context.close();
    await browser.close().catch(() => {});
    fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`);
  }

  console.log(`verify-anduril-reporter-browser: ${path.relative(root, resultPath)} passed`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
