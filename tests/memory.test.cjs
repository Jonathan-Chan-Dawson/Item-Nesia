const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryRepository } = require('../.test-build/repositories/memory');
const { emptyData } = require('../.test-build/types/models');
const {
  placePath,
  searchItems,
  validateParent,
} = require('../.test-build/utils/memory');

function setup() {
  let saved = emptyData();
  let current;
  let fail = false;
  const removed = [];
  const adapter = {
    load: async () => structuredClone(saved),
    save: async (data) => {
      if (fail) throw new Error('Disk full');
      saved = structuredClone(data);
    },
  };
  const repo = new MemoryRepository(
    adapter,
    (data) => {
      current = data;
    },
    async (uri) => {
      removed.push(uri);
    },
  );
  return {
    repo,
    adapter,
    removed,
    current: () => current,
    fail: (value) => {
      fail = value;
    },
  };
}
const draft = (name, placeId, extra = {}) => ({
  name,
  placeId,
  aliases: [],
  tags: [],
  ...extra,
});

test('fresh initialization stays empty; demo restoration is additive and idempotent', async () => {
  const env = setup();
  await env.repo.initialize();
  assert.equal(env.current().items.length, 0);
  const id = await env.repo.saveItem(
    draft('Real wallet', undefined, { exactSpot: 'Desk' }),
  );
  await env.repo.seedDemo();
  await env.repo.seedDemo();
  assert.equal(env.current().items.length, 16);
  assert.ok(env.current().items.find((i) => i.id === id));
  assert.equal(env.current().settings.demoInitialized, true);
  assert.equal(
    env.current().history.filter((h) => h.id === 'demo-history-wallet').length,
    1,
  );
});
test('save, move, history, archive, and settings survive a repository restart', async () => {
  const env = setup();
  await env.repo.initialize();
  const bedroom = await env.repo.savePlace('Bedroom');
  const bag = await env.repo.savePlace('Backpack');
  const id = await env.repo.saveItem(
    draft('Charger', bedroom, { photoUri: 'file://item.jpg' }),
  );
  await env.repo.saveItem(
    draft('Charger', bag, {
      photoUri: 'file://item.jpg',
      exactSpot: 'Front pocket',
    }),
    id,
  );
  await env.repo.updateItem(id, { isArchived: true, isFavorite: true });
  await env.repo.settings({ theme: 'dark', hapticsEnabled: false });
  let reloaded;
  await new MemoryRepository(env.adapter, (data) => {
    reloaded = data;
  }).initialize();
  assert.equal(reloaded.items[0].placeId, bag);
  assert.equal(reloaded.items[0].photoUri, 'file://item.jpg');
  assert.equal(reloaded.history.length, 2);
  assert.equal(reloaded.history[0].previousPlaceId, bedroom);
  assert.equal(reloaded.items[0].isArchived, true);
  assert.equal(reloaded.settings.theme, 'dark');
  assert.equal(
    searchItems(reloaded.items, reloaded.places, 'charger').length,
    0,
  );
});
test('search normalizes spaces and case, ranks names, and matches parent places and aliases', async () => {
  const env = setup();
  await env.repo.initialize();
  await env.repo.seedDemo();
  await env.repo.saveItem(
    draft('Travel kit', 'demo-dresser', {
      description: 'Contains wallet',
      aliases: ['holiday pouch'],
    }),
  );
  const { items, places } = env.current();
  assert.equal(searchItems(items, places, '  WALLET  ')[0].name, 'Blue Wallet');
  assert.equal(
    searchItems(items, places, 'holiday   pouch')[0].name,
    'Travel kit',
  );
  assert.ok(
    searchItems(items, places, 'bedroom').some((i) => i.name === 'Blue Wallet'),
  );
  assert.ok(
    searchItems(items, places, 'charger').some((i) => i.name === 'USB-C Cable'),
  );
  assert.equal(searchItems(items, places, 'definitely missing').length, 0);
});
test('place hierarchy rejects cycles and unknown parents', async () => {
  const env = setup();
  await env.repo.initialize();
  const room = await env.repo.savePlace('Bedroom');
  const drawer = await env.repo.savePlace('Drawer', room);
  assert.equal(placePath(drawer, env.current().places), 'Bedroom › Drawer');
  await assert.rejects(
    env.repo.savePlace('Bedroom', drawer, room),
    /inside itself/,
  );
  assert.throws(
    () => validateParent('new', 'missing', env.current().places),
    /no longer exists/,
  );
});
test('failed saves never publish partial state; later writes still succeed', async () => {
  const env = setup();
  await env.repo.initialize();
  env.fail(true);
  await assert.rejects(
    env.repo.saveItem(draft('Wallet', undefined, { exactSpot: 'Desk' })),
    /Disk full/,
  );
  assert.equal(env.current().items.length, 0);
  assert.equal(env.current().history.length, 0);
  env.fail(false);
  await env.repo.saveItem(draft('Wallet', undefined, { exactSpot: 'Desk' }));
  assert.equal(env.current().items.length, 1);
});
test('concurrent mutations serialize without losing items; validation rejects blank fields', async () => {
  const env = setup();
  await env.repo.initialize();
  await Promise.all(
    Array.from({ length: 10 }, (_, n) =>
      env.repo.saveItem(draft(`Item ${n}`, undefined, { exactSpot: 'Desk' })),
    ),
  );
  assert.equal(env.current().items.length, 10);
  await assert.rejects(
    env.repo.saveItem(draft('   ', undefined, { exactSpot: 'Desk' })),
    /name/,
  );
  await assert.rejects(env.repo.saveItem(draft('Wallet')), /place/);
});
test('shared photos are removed only after their final reference is deleted', async () => {
  const env = setup();
  await env.repo.initialize();
  const a = await env.repo.saveItem(
    draft('A', undefined, { exactSpot: 'Desk', photoUri: 'file://shared.jpg' }),
  );
  const b = await env.repo.saveItem(
    draft('B', undefined, { exactSpot: 'Desk', photoUri: 'file://shared.jpg' }),
  );
  await env.repo.deleteItem(a);
  assert.deepEqual(env.removed, []);
  await env.repo.deleteItem(b);
  assert.deepEqual(env.removed, ['file://shared.jpg']);
  assert.equal(env.current().history.length, 0);
});
