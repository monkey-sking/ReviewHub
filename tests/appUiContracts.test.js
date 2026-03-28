const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readAppSource() {
  return fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
}

test('inbox defaults to the ready tab so actionable items are visible first', () => {
  const source = readAppSource();

  assert.match(source, /inboxTab:\s*'ready'/);
  assert.match(source, /state\.inboxTab\s*=\s*'ready'/);
});

test('queue blocker actions are separate from defer-with-date actions', () => {
  const source = readAppSource();

  assert.match(source, /action:\s*'mark_blocked',\s*label:\s*'标记阻塞'/);
  assert.doesNotMatch(source, /action:\s*'mark_deferred',\s*label:\s*'标记阻塞'/);
  assert.match(source, /if\s*\(action === 'mark_blocked'\)\s*\{\s*return item\.action_state !== 'deferred';\s*\}/s);
  assert.match(source, /if\s*\(action === 'mark_deferred' && !requireDeferUntil\(/);
});

test('queue is the default active section and workboard is no longer a primary nav card', () => {
  const source = readAppSource();

  assert.match(source, /activeSection:\s*'queue'/);
  assert.doesNotMatch(source, /section:\s*'workboard',\s*title:\s*'工作台'/);
  assert.match(source, /section:\s*'queue',\s*title:\s*'Inbox'/);
});

test('queue is the default active section and workboard is no longer a primary nav card', () => {
  const source = readAppSource();

  assert.match(source, /activeSection:\s*'queue'/);
  assert.doesNotMatch(source, /section:\s*'workboard',\s*title:\s*'工作台'/);
  assert.match(source, /section:\s*'queue',\s*title:\s*'Inbox'/);
});

test('queue is the default active section and workboard is no longer a primary nav card', () => {
  const source = readAppSource();

  assert.match(source, /activeSection:\s*'queue'/);
  assert.doesNotMatch(source, /section:\s*'workboard',\s*title:\s*'工作台'/);
  assert.match(source, /section:\s*'queue',\s*title:\s*'Inbox'/);
});
