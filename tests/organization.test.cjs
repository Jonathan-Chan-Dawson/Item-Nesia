const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { emptyData } = require('../.test-build/types/models');
const { MemoryRepository } = require('../.test-build/repositories/memory');
const {
  queryInventory,
  recordedAt,
} = require('../.test-build/utils/inventory');
const { validShortcuts } = require('../.test-build/utils/preferences');
const { createBackup, readBackup } = require('../.test-build/utils/backup');
const { folderPath } = require('../.test-build/utils/folders');
async function setup() {
  let saved = emptyData();
  let data;
  const adapter = {
    load: async () => structuredClone(saved),
    save: async (next) => {
      saved = structuredClone(next);
    },
  };
  const repo = new MemoryRepository(adapter, (next) => {
    data = next;
  });
  await repo.initialize();
  const kitchen = await repo.savePlace('Kitchen');
  const drawer = await repo.savePlace('Utensil drawer', kitchen);
  const garage = await repo.savePlace('Garage');
  const camping = await repo.saveFolder('Camping');
  const kit = await repo.saveFolder('Cooking kit', camping);
  const save = (name, placeId, folderId, category) =>
    repo.saveItem({ name, placeId, folderId, category, tags: [], aliases: [] });
  const spoon = await save('Spoon', drawer, undefined, 'Kitchen & Dining');
  const spatula = await save('Spatula', garage, kit, 'Kitchen & Dining');
  const cable = await save('USB cable', drawer, camping, 'Electronics');
  const receipt = await save('Receipt', garage);
  await repo.updateItem(spoon, { isFavorite: true });
  await repo.updateItem(receipt, { isFavorite: true, isArchived: true });
  return {
    repo,
    adapter,
    data: () => data,
    kitchen,
    drawer,
    garage,
    camping,
    kit,
    spoon,
    spatula,
    cable,
    receipt,
  };
}
const query = (data, patch = {}) =>
  queryInventory(data, {
    text: '',
    view: 'all',
    includeDescendants: true,
    sort: 'name',
    layout: 'list',
    ...patch,
  });
test('place, folder, category, and search scopes share the same intersection rules', async () => {
  const env = await setup();
  assert.deepEqual(
    query(env.data(), { placeId: env.kitchen })
      .map((i) => i.id)
      .sort(),
    [env.spoon, env.cable].sort(),
  );
  assert.equal(
    query(env.data(), { placeId: env.kitchen, includeDescendants: false })
      .length,
    0,
  );
  assert.deepEqual(
    query(env.data(), { folderId: env.camping })
      .map((i) => i.id)
      .sort(),
    [env.spatula, env.cable].sort(),
  );
  assert.deepEqual(
    query(env.data(), { folderId: env.camping, includeDescendants: false }).map(
      (i) => i.id,
    ),
    [env.cable],
  );
  assert.deepEqual(
    query(env.data(), {
      category: 'Kitchen & Dining',
      placeId: env.garage,
    }).map((i) => i.id),
    [env.spatula],
  );
  assert.equal(
    query(env.data(), { text: '  cooking   kit ' })[0].id,
    env.spatula,
  );
  assert.equal(query(env.data(), { text: 'kitchen' }).length, 3);
});
test('archive, favorites, Unfiled, and Uncategorized remain independent', async () => {
  const env = await setup();
  assert.deepEqual(
    query(env.data(), { view: 'favorites' }).map((i) => i.id),
    [env.spoon],
  );
  assert.deepEqual(
    query(env.data(), { view: 'archived', text: 'receipt' }).map((i) => i.id),
    [env.receipt],
  );
  assert.deepEqual(
    query(env.data(), { folderId: 'unfiled' }).map((i) => i.id),
    [env.spoon],
  );
  assert.equal(query(env.data(), { category: 'uncategorized' }).length, 0);
  assert.equal(
    query(env.data(), { category: 'uncategorized', view: 'archived' })[0].id,
    env.receipt,
  );
});
test('all inventory sorts work without changing their source data', async () => {
  const env = await setup();
  const data = structuredClone(env.data());
  const names = data.items.map((i) => i.name);
  const items = data.items.filter((i) => !i.isArchived);
  items.forEach((i, index) => {
    i.createdAt = `2026-01-0${index + 1}T00:00:00.000Z`;
    i.locationUpdatedAt = `2026-02-0${3 - index}T00:00:00.000Z`;
  });
  assert.equal(query(data, { sort: 'oldest' })[0].name, 'Spoon');
  assert.equal(query(data, { sort: 'recent' })[0].name, 'USB cable');
  assert.equal(query(data, { sort: 'moved' })[0].name, 'Spoon');
  assert.equal(
    query(data, { text: 'spat', sort: 'relevance' })[0].name,
    'Spatula',
  );
  assert.deepEqual(
    data.items.map((i) => i.name),
    names,
  );
});
test('filing and favoriting do not create physical moves or change Home recording order', async () => {
  const env = await setup();
  const before = env.data().items.find((i) => i.id === env.spoon);
  const history = env.data().history.length;
  await env.repo.saveItem({ ...before, folderId: env.kit }, before.id);
  await env.repo.updateItem(before.id, { isFavorite: false });
  const after = env.data().items.find((i) => i.id === before.id);
  assert.equal(after.placeId, before.placeId);
  assert.equal(recordedAt(after), recordedAt(before));
  assert.equal(env.data().history.length, history);
});
test('Quick Access persists, deduplicates, caps at four, and removes deleted folders', async () => {
  const env = await setup();
  const refs = [
    { kind: 'place', id: env.kitchen },
    { kind: 'folder', id: env.camping },
    { kind: 'place', id: env.drawer },
    { kind: 'folder', id: env.kit },
  ];
  for (const ref of refs) await env.repo.toggleShortcut(ref);
  await assert.rejects(
    env.repo.toggleShortcut({ kind: 'place', id: env.garage }),
    /four/,
  );
  let restored;
  await new MemoryRepository(env.adapter, (data) => {
    restored = data;
  }).initialize();
  assert.deepEqual(restored.settings.quickAccess, refs);
  assert.deepEqual(
    validShortcuts(
      [
        refs[0],
        refs[0],
        { kind: 'place', id: 'missing' },
        { kind: 'bad', id: env.kitchen },
      ],
      env.data(),
    ),
    [refs[0]],
  );
  await env.repo.deleteFolder(env.kit);
  assert.equal(env.data().settings.quickAccess.length, 3);
  await env.repo.settings({
    quickAccess: [...env.data().settings.quickAccess].reverse(),
  });
  assert.equal(env.data().settings.quickAccess[0].id, env.drawer);
  await env.repo.clear();
  assert.deepEqual(env.data().settings.quickAccess, []);
});
test('older stored data gains empty Quick Access without losing items', async () => {
  const env = await setup();
  const old = structuredClone(env.data());
  delete old.settings.quickAccess;
  let upgraded;
  await new MemoryRepository(
    { load: async () => old, save: async () => {} },
    (data) => {
      upgraded = data;
    },
  ).initialize();
  assert.equal(upgraded.items.length, old.items.length);
  assert.deepEqual(upgraded.settings.quickAccess, []);
});
test('version 4 backups preserve Kitchen category and shortcuts, while version 1 remains readable', async () => {
  const env = await setup();
  await env.repo.settings({ homeItemsView: 'list' });
  await env.repo.toggleShortcut({ kind: 'place', id: env.kitchen });
  const bytes = await createBackup(await env.repo.snapshot(), async () => {
    throw new Error('unused');
  });
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.version, 4);
  const v2 = await readBackup(bytes);
  assert.equal(v2.data.settings.homeItemsView, 'list');
  assert.deepEqual(v2.data.settings.quickAccess, [
    { kind: 'place', id: env.kitchen },
  ]);
  assert.ok(v2.data.items.some((i) => i.category === 'Kitchen & Dining'));
  manifest.version = 1;
  delete manifest.data.settings.quickAccess;
  delete manifest.data.settings.homeItemsView;
  manifest.data.items.forEach((i) => {
    if (i.category === 'Kitchen & Dining') i.category = 'Household';
  });
  zip.file('manifest.json', JSON.stringify(manifest));
  const v1 = await readBackup(
    await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }),
  );
  assert.deepEqual(v1.data.settings.quickAccess, []);
  assert.equal(v1.data.settings.homeItemsView, 'grid');
  assert.equal(v1.data.items.length, env.data().items.length);
});
test('duplicate records retain shared photographs and get independent identities and history', async () => {
  const env = await setup();
  const original = env.data().items.find((i) => i.id === env.spoon);
  await env.repo.saveItem(
    { ...original, photoUri: 'file://shared.jpg' },
    original.id,
  );
  const copyId = await env.repo.duplicateItem(original.id);
  const copy = env.data().items.find((i) => i.id === copyId);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.photoUri, 'file://shared.jpg');
  assert.equal(copy.name, 'Spoon (copy)');
  assert.equal(env.data().history.filter((h) => h.itemId === copyId).length, 1);
});

test('deleting a top-level folder unfiles direct items and promotes children without losing belongings', async () => {
  const env = await setup();
  const cable = env.data().items.find((item) => item.id === env.cable);
  await env.repo.saveItem({ ...cable, photoUri: 'file://cable.jpg' }, cable.id);
  await env.repo.updateItem(cable.id, { isArchived: true });
  const before = await env.repo.snapshot();

  await env.repo.deleteFolder(env.camping);

  const after = await env.repo.snapshot();
  assert.equal(
    after.folders.find((folder) => folder.id === env.kit).parentId,
    undefined,
  );
  assert.equal(
    after.folders.some((folder) => folder.id === env.camping),
    false,
  );
  const expectedItems = structuredClone(before.items);
  delete expectedItems.find((item) => item.id === env.cable).folderId;
  assert.deepEqual(after.items, expectedItems);
  assert.deepEqual(after.history, before.history);
  assert.deepEqual(
    query(after, { folderId: env.kit }).map((item) => item.id),
    [env.spatula],
  );
  assert.deepEqual(
    query(after, { folderId: 'unfiled', view: 'archived' })
      .map((item) => item.id)
      .sort(),
    [env.cable, env.receipt].sort(),
  );
  let reloaded;
  await new MemoryRepository(env.adapter, (data) => {
    reloaded = data;
  }).initialize();
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded)), after);
});

test('reparenting a folder updates descendant paths and search without changing item locations', async () => {
  const env = await setup();
  const tools = await env.repo.saveFolder('Tools', env.kit);
  const spatula = env.data().items.find((item) => item.id === env.spatula);
  await env.repo.saveItem({ ...spatula, folderId: tools }, spatula.id);
  const travel = await env.repo.saveFolder('Travel');
  const before = await env.repo.snapshot();

  await env.repo.saveFolder('Cooking kit', travel, env.kit);

  const after = await env.repo.snapshot();
  assert.equal(
    folderPath(tools, after.folders),
    'Travel › Cooking kit › Tools',
  );
  assert.deepEqual(
    query(after, { folderId: env.camping }).map((item) => item.id),
    [env.cable],
  );
  assert.deepEqual(
    query(after, { folderId: travel }).map((item) => item.id),
    [env.spatula],
  );
  assert.equal(
    query(after, { folderId: travel, includeDescendants: false }).length,
    0,
  );
  assert.deepEqual(
    query(after, { text: 'travel' }).map((item) => item.id),
    [env.spatula],
  );
  assert.deepEqual(after.items, before.items);
  assert.deepEqual(after.history, before.history);
});

test('invalid folder changes leave published and persisted data intact and later filing succeeds', async () => {
  const env = await setup();
  const before = await env.repo.snapshot();
  const spoon = before.items.find((item) => item.id === env.spoon);
  await assert.rejects(env.repo.saveFolder('   '), /name/);
  await assert.rejects(
    env.repo.saveFolder('Orphan', 'missing-parent'),
    /no longer exists/,
  );
  await assert.rejects(
    env.repo.saveFolder('Camping', env.camping, env.camping),
    /inside itself/,
  );
  await assert.rejects(
    env.repo.saveItem({ ...spoon, folderId: 'deleted-folder' }, spoon.id),
    /folder no longer exists/,
  );
  await assert.rejects(
    env.repo.deleteFolder('missing-folder'),
    /no longer exists/,
  );
  assert.deepEqual(env.data(), before);
  let reloaded;
  await new MemoryRepository(env.adapter, (data) => {
    reloaded = data;
  }).initialize();
  assert.deepEqual(reloaded, before);

  await env.repo.saveItem({ ...spoon, folderId: env.kit }, spoon.id);
  await env.repo.saveItem({ ...spoon, folderId: undefined }, spoon.id);
  assert.deepEqual(
    query(env.data(), { folderId: 'unfiled' }).map((item) => item.id),
    [spoon.id],
  );
  assert.deepEqual(env.data().history, before.history);
});
