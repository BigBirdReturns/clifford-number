const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

fs.mkdirSync('browser-qa', { recursive: true });
const result = {
  passed: false,
  stage: 'launch',
  refused: null,
  blocked: null,
  traversable: null,
  console_errors: [],
  page_errors: [],
  error: null
};

function persist() {
  fs.writeFileSync('browser-qa/result.json', JSON.stringify(result, null, 2) + '\n');
}

persist();

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, timeout: 20000 });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    page.on('console', message => {
      if (message.type() === 'error') result.console_errors.push(message.text());
    });
    page.on('pageerror', error => result.page_errors.push(error.message));

    result.stage = 'load-page';
    persist();
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[data-ap-mode="route"]', { timeout: 20000 });
    await page.click('[data-ap-mode="route"]');
    await page.waitForSelector('#ap-route-from', { timeout: 10000 });

    async function chooseActor(selector, label) {
      const option = await page.locator(`${selector} option`).evaluateAll((nodes, wanted) =>
        nodes.map(node => ({ value: node.value, text: node.textContent.trim() }))
          .find(candidate => candidate.text.toLowerCase().includes(wanted.toLowerCase())), label);
      assert.ok(option, `${label} must be present in ${selector}`);
      await page.selectOption(selector, option.value);
      await page.dispatchEvent(selector, 'change');
      return option;
    }

    result.stage = 'choose-endpoints';
    persist();
    result.from = await chooseActor('#ap-route-from', 'John Healey');
    result.to = await chooseActor('#ap-route-to', 'Matt Clifford');

    async function setDate(value) {
      await page.fill('#ap-route-asof', value);
      await page.dispatchEvent('#ap-route-asof', 'change');
    }

    async function readPacket(predicate, label) {
      let lastPacket = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        const text = await page.locator('#aperture-export-json').textContent().catch(() => '');
        if (text && text.trim()) {
          try {
            lastPacket = JSON.parse(text);
            if (predicate(lastPacket)) return lastPacket;
          } catch {}
        }
        await page.waitForTimeout(100);
      }
      result.last_packet = lastPacket;
      persist();
      throw new Error(`Timed out waiting for ${label}`);
    }

    result.stage = 'refused';
    persist();
    await setDate('not-a-date');
    await page.locator('[data-ap-action="export-toggle"]').first().click();
    await page.waitForSelector('#aperture-export:not([hidden])', { timeout: 10000 });
    const refused = await readPacket(packet => packet.view?.temporal_input_valid === false, 'refused packet');
    result.refused = {
      temporal_input_valid: refused.view.temporal_input_valid,
      path: refused.view.path,
      diagnostics: refused.view.diagnostics,
      table_rows: refused.view.table.rows.length,
      caption: refused.caption
    };
    persist();
    assert.equal(refused.view.path, null);
    assert.equal(refused.view.diagnostics, null);
    assert.deepEqual(refused.view.table.rows, []);
    assert.match(refused.caption, /No route was computed/);
    assert.match(refused.caption, /states nothing about whether a documented route exists/i);
    assert.doesNotMatch(refused.caption, /survives the current compiled corpus/i);

    result.stage = 'blocked';
    persist();
    await setDate('2020');
    const blocked = await readPacket(packet => packet.view?.temporal_input_valid === true && packet.view?.as_of === '2020', 'blocked packet');
    result.blocked = {
      temporal_input_valid: blocked.view.temporal_input_valid,
      path: blocked.view.path,
      diagnostics: blocked.view.diagnostics,
      table_rows: blocked.view.table.rows.length,
      caption: blocked.caption
    };
    persist();
    assert.equal(blocked.view.path, null);
    assert.ok(blocked.view.diagnostics);
    assert.ok(blocked.view.diagnostics.time_blocked_bases > 0);
    assert.match(blocked.caption, /No actor-to-actor route/);
    assert.match(blocked.caption, /not proof that no relationship exists/i);

    result.stage = 'traversable';
    persist();
    await setDate('');
    const traversable = await readPacket(packet => packet.view?.temporal_input_valid === true && packet.view?.as_of === null && packet.view?.path?.hops?.length > 0, 'traversable packet');
    result.traversable = {
      temporal_input_valid: traversable.view.temporal_input_valid,
      hop_count: traversable.view.path.hops.length,
      table_rows: traversable.view.table.rows.length,
      caption: traversable.caption,
      hops: traversable.view.path.hops
    };
    persist();
    assert.ok(traversable.view.path.hops.length >= 1);
    assert.equal(traversable.view.table.rows.length, traversable.view.path.hops.length);
    assert.match(traversable.caption, /connects to/);
    for (const hop of traversable.view.path.hops) {
      assert.ok(hop.from.actor_id);
      assert.ok(hop.to.actor_id);
      assert.ok(hop.surface.surface_id);
      assert.ok(hop.surface.surface_label);
    }

    result.stage = 'console';
    persist();
    assert.deepEqual(result.page_errors, []);
    assert.deepEqual(result.console_errors, []);
    result.passed = true;
    result.stage = 'complete';
    persist();
  } catch (error) {
    result.error = { message: error.message, stack: error.stack };
    persist();
    throw error;
  } finally {
    await browser?.close().catch(() => {});
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
