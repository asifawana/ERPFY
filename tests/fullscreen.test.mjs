import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  entryPoints: ['lib/fullscreen.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const {
  isDocumentFullscreen,
  subscribeFullscreen,
  toggleDocumentFullscreen,
} = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
);

function browserDocument() {
  return Object.assign(new EventTarget(), {
    documentElement: {},
    fullscreenElement: null,
    fullscreenEnabled: true,
  });
}

test('entry invokes the browser immediately and waits for actual fullscreen state', async () => {
  const doc = browserDocument();
  let called = false;
  let finish;
  doc.documentElement.requestFullscreen = function () {
    assert.equal(this, doc.documentElement);
    called = true;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const request = toggleDocumentFullscreen(doc);
  assert.equal(
    called,
    true,
    'request must retain the original click activation',
  );
  assert.equal(isDocumentFullscreen(doc), false);
  doc.fullscreenElement = doc.documentElement;
  finish();
  await request;
  assert.equal(isDocumentFullscreen(doc), true);
});

test('rejected and synchronously failed requests do not claim fullscreen', async () => {
  for (const fail of [
    () => Promise.reject(new TypeError('Permission denied')),
    () => {
      throw new TypeError('Document inactive');
    },
  ]) {
    const doc = browserDocument();
    doc.documentElement.requestFullscreen = fail;
    await assert.rejects(toggleDocumentFullscreen(doc), TypeError);
    assert.equal(isDocumentFullscreen(doc), false);
  }
});

test('exit uses the document API and preserves state when exit fails', async () => {
  const doc = browserDocument();
  doc.fullscreenElement = doc.documentElement;
  doc.exitFullscreen = function () {
    assert.equal(this, doc);
    return Promise.reject(new TypeError('Exit failed'));
  };
  await assert.rejects(toggleDocumentFullscreen(doc));
  assert.equal(isDocumentFullscreen(doc), true);
  doc.exitFullscreen = async function () {
    this.fullscreenElement = null;
  };
  await toggleDocumentFullscreen(doc);
  assert.equal(isDocumentFullscreen(doc), false);
});

test('unavailable and policy-blocked APIs return an actionable error', async () => {
  const doc = browserDocument();
  await assert.rejects(
    toggleDocumentFullscreen(doc),
    /does not support fullscreen/,
  );
  doc.fullscreenEnabled = false;
  doc.documentElement.requestFullscreen = () =>
    assert.fail('blocked API must not run');
  await assert.rejects(
    toggleDocumentFullscreen(doc),
    /not allowed in this window/,
  );
});

test('WebKit entry and exit work with void-returning methods', async () => {
  const doc = browserDocument();
  doc.documentElement.webkitRequestFullscreen = function () {
    doc.webkitFullscreenElement = this;
  };
  doc.webkitExitFullscreen = function () {
    this.webkitFullscreenElement = null;
  };
  await toggleDocumentFullscreen(doc);
  assert.equal(isDocumentFullscreen(doc), true);
  await toggleDocumentFullscreen(doc);
  assert.equal(isDocumentFullscreen(doc), false);
});

test('state subscription reflects Esc/external entry and removes both listeners', () => {
  const doc = browserDocument();
  doc.fullscreenElement = doc.documentElement;
  assert.equal(
    isDocumentFullscreen(doc),
    true,
    'remount reads the current state',
  );
  const states = [];
  const unsubscribe = subscribeFullscreen(doc, () =>
    states.push(isDocumentFullscreen(doc)),
  );
  doc.fullscreenElement = null;
  doc.dispatchEvent(new Event('fullscreenchange'));
  doc.webkitFullscreenElement = doc.documentElement;
  doc.dispatchEvent(new Event('webkitfullscreenchange'));
  assert.deepEqual(states, [false, true]);
  unsubscribe();
  doc.dispatchEvent(new Event('fullscreenchange'));
  doc.dispatchEvent(new Event('webkitfullscreenchange'));
  assert.deepEqual(states, [false, true]);
});

