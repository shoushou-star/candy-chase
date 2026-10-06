const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, 'play-session-browser-qa.cjs'), 'utf8');
function harness(env) {
  let launches = 0;
  const requests = [];
  const files = { 'rhythm-game/embed-bridge.js': 'bridge', 'assets/pregame-intro-test.mp4': 'video' };
  const sandbox = {
    URL, Buffer, console,
    process: { env, stdout: { write() {} } },
    require(name) {
      if (name === 'playwright') return { chromium: { launch() { launches++; return new Promise(() => {}); } } };
      if (name === 'node:fs') return {
        mkdirSync() {}, writeFileSync() {},
        readdirSync(root) { return root.endsWith('rhythm-game') ? ['embed-bridge.js'] : ['pregame-intro-test.mp4']; },
        readFileSync(file) { return Buffer.from(files[path.relative(path.resolve('dist'), file).replaceAll('\\', '/')] || 'fixture'); },
      };
      return require(name);
    },
    async fetch(url) {
      requests.push(url);
      const relative = new URL(url).pathname.slice(1);
      return { status: 200, headers: { get() { return relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.html') ? 'text/html' : relative.endsWith('.m4a') ? 'audio/mp4' : 'video/mp4'; } }, async arrayBuffer() { return Buffer.from(files[relative] || 'fixture'); } };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nglobalThis.qa = { mode, resources, running, waitBgm, settlement, report };`, sandbox);
  return { qa: sandbox.qa, requests, launches: () => launches };
}

test('explicit production checks HTTP/MIME/hash resources on a non-4180 port', async () => {
  const h = harness({ BASE_URL: 'http://127.0.0.1:4197', QA_MODE: 'production' });
  await h.qa.resources();
  assert.equal(h.qa.mode, 'production');
  assert.equal(h.requests.length, 4);
  assert.ok(h.requests.every(url => url.startsWith('http://127.0.0.1:4197/')));
  assert.equal(h.qa.report.resources.find(r => r.path.includes('pregame-intro')).sha256, createHash('sha256').update('video').digest('hex'));
});

test('explicit development skips production checks even on port 4180; legacy defaults remain', async () => {
  const h = harness({ BASE_URL: 'http://127.0.0.1:4180', QA_MODE: 'development' });
  await h.qa.resources();
  assert.equal(h.qa.mode, 'development');
  assert.equal(h.requests.length, 0);
  assert.equal(harness({ BASE_URL: 'http://127.0.0.1:4180' }).qa.mode, 'production');
  assert.equal(harness({}).qa.mode, 'development');
});

test('invalid QA_MODE fails before browser launch', () => {
  assert.throws(() => harness({ QA_MODE: 'prod' }), /QA_MODE.*development.*production/);
});

test('countdown, BGM and settlement waits send their intended timeout as options', async () => {
  const h = harness({});
  const waits = [];
  const waitForFunction = async (fn, arg, options) => {
    assert.equal(typeof fn, 'function');
    assert.equal(arg, null);
    assert.ok(options && Number.isFinite(options.timeout), 'timeout belongs in the third options argument');
    waits.push(options.timeout);
  };
  const game = { waitForFunction, locator() { return { async isVisible() { return false; } }; } };
  const page = {
    waitForFunction,
    locator(selector) {
      return { async waitFor() {}, async elementHandle() { return { async contentFrame() { return game; } }; } };
    },
    getByRole() { return { async isVisible() { return false; }, async count() { return 1; } }; },
  };
  await h.qa.running(page);
  await h.qa.waitBgm(game);
  await h.qa.settlement(page, { finalScore: 0, perfect: 0, good: 0, miss: 80, maxCombo: 0, starRating: 0 });
  assert.deepEqual(waits, [12000, 15000, 12000]);
});
