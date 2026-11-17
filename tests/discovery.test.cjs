const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { emptyData, categories } = require('../.test-build/types/models');
const { MemoryRepository } = require('../.test-build/repositories/memory');
const { withDemo, organizeDemo } = require('../.test-build/database/demo');
const {
  queryInventory,
  groupInventory,
  randomItem,
} = require('../.test-build/utils/inventory');
const { createBackup, readBackup } = require('../.test-build/utils/backup');
const {
  iconNames,
  commonIcons,
  iconSection,
  validIcon,
} = require('../.test-build/utils/icons');
async function fixture() {
  let saved = emptyData(),
    data,
    fail = false;
  const removed = [];
  const adapter = {
    load: async () => structuredClone(saved),
    save: async (next) => {
      if (fail) throw new Error('Disk full');
      saved = structuredClone(next);
    },
  };
  const repo = new MemoryRepository(
    adapter,
    (next) => {
      data = next;
    },
    async (uri) => {
      removed.push(uri);
    },
  );
  await repo.initialize();
  return {
    repo,
    adapter,
    data: () => data,
    removed,
    fail: (value) => {
      fail = value;
    },
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
const draft = (name, extra = {}) => ({
  name,
  exactSpot: 'Desk',
  aliases: [],
  tags: [],
  ...extra,
});
test('demo has 60 items, 54 filed items, eight groups and at least two examples of every type', () => {
  const data = withDemo(emptyData());
  assert.equal(data.items.length, 60);
  assert.equal(data.items.filter((item) => item.folderId).length, 54);
  assert.equal(data.folders.length, 8);
  for (const category of categories)
    assert.ok(
      data.items.filter((item) => item.category === category).length >= 2,
      category,
    );
  for (const item of data.items) {
    assert.ok(data.places.some((place) => place.id === item.placeId));
    if (item.folderId)
      assert.ok(data.folders.some((folder) => folder.id === item.folderId));
  }
  assert.equal(withDemo(data).items.length, 60);
});
test('organizing older samples changes filing only, preserving personal, assigned and trashed records', () => {
  const data = withDemo(emptyData());
  data.items.forEach((item) => {
    delete item.folderId;
  });
  data.items[0].name = 'Renamed sample';
  data.items[1].folderId = data.folders[2].id;
  data.items[2].deletedAt = '2026-11-17T00:00:00.000Z';
  data.items.push({ ...data.items[3], id: 'personal', isDemo: false });
  const before = structuredClone(data);
  const after = organizeDemo(data);
  assert.equal(after.items[0].name, 'Renamed sample');
  assert.ok(after.items[0].folderId);
  for (const index of [1, 2, 60])
    assert.deepEqual(after.items[index], before.items[index]);
  assert.deepEqual(after.history, before.history);
  after.items.forEach((item, index) => {
    const { folderId: _a, ...a } = item;
    const { folderId: _b, ...b } = before.items[index];
    assert.deepEqual(a, b);
  });
  assert.deepEqual(organizeDemo(after), after);
});
test('Trash persists and retains photos/history; restore keeps archived state and blocked edits stay blocked', async () => {
  const env = await fixture();
  const id = await env.repo.saveItem(
    draft('Kit', { photoUri: 'file://kit.jpg' }),
  );
  await env.repo.updateItem(id, { isArchived: true });
  const before = await env.repo.snapshot();
  await env.repo.trashItem(id);
  assert.equal(query(env.data()).length, 0);
  assert.equal(query(env.data(), { view: 'archived' }).length, 0);
  assert.equal(query(env.data(), { view: 'trash' }).length, 1);
  assert.deepEqual(env.data().history, before.history);
  assert.deepEqual(env.removed, []);
  await assert.rejects(env.repo.updateItem(id, { isFavorite: true }), /Trash/);
  await assert.rejects(env.repo.saveItem(draft('Changed'), id), /Trash/);
  await assert.rejects(env.repo.duplicateItem(id), /Trash/);
  let reloaded;
  await new MemoryRepository(env.adapter, (data) => {
    reloaded = data;
  }).initialize();
  assert.ok(reloaded.items[0].deletedAt);
  await env.repo.restoreItem(id);
  assert.equal(env.data().items[0].deletedAt, undefined);
  assert.equal(env.data().items[0].isArchived, true);
  assert.deepEqual(env.data().history, before.history);
});
test('failed Trash mutations leave data intact; emptying removes only trash and final photo references', async () => {
  const env = await fixture();
  const a = await env.repo.saveItem(
    draft('A', { photoUri: 'file://shared.jpg' }),
  );
  const b = await env.repo.saveItem(
    draft('B', { photoUri: 'file://shared.jpg' }),
  );
  const before = await env.repo.snapshot();
  env.fail(true);
  await assert.rejects(env.repo.trashItem(a), /Disk full/);
  assert.deepEqual(await env.repo.snapshot(), before);
  env.fail(false);
  await env.repo.trashItem(a);
  await env.repo.emptyTrash();
  assert.equal(env.data().items.length, 1);
  assert.equal(env.data().items[0].id, b);
  assert.deepEqual(env.removed, []);
  assert.equal(
    env.data().history.some((h) => h.itemId === a),
    false,
  );
  await env.repo.trashItem(b);
  await env.repo.emptyTrash();
  assert.deepEqual(env.removed, ['file://shared.jpg']);
});
test('folder deletion safely reassigns trashed items and sample restoration never resurrects them', async () => {
  const env = await fixture();
  await env.repo.seedDemo();
  const item = env.data().items.find((item) => item.folderId);
  await env.repo.trashItem(item.id);
  await env.repo.deleteFolder(item.folderId);
  assert.equal(
    env.data().items.find((i) => i.id === item.id).folderId,
    undefined,
  );
  await env.repo.seedDemo();
  assert.ok(env.data().items.find((i) => i.id === item.id).deletedAt);
});
test('grouping assigns every filtered item once, includes unfiled groups and preserves input order', () => {
  const data = withDemo(emptyData());
  const source = query(data);
  const before = structuredClone(source);
  for (const by of ['folders', 'places', 'categories']) {
    const groups = groupInventory(source, data, by);
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    assert.equal(ids.length, source.length);
    assert.equal(new Set(ids).size, source.length);
    assert.ok(groups.every((group) => group.label));
  }
  assert.ok(
    groupInventory(source, data, 'folders').some(
      (group) => group.label === 'Unfiled',
    ),
  );
  assert.deepEqual(source, before);
});
test('place and folder descendant settings can be selected independently', async () => {
  const env = await fixture();
  const room = await env.repo.savePlace('Room');
  const shelf = await env.repo.savePlace('Shelf', room);
  const root = await env.repo.saveFolder('Root');
  const child = await env.repo.saveFolder('Child', root);
  const id = await env.repo.saveItem(
    draft('Stored item', { placeId: shelf, folderId: child }),
  );
  const scope = { placeId: room, folderId: root };
  assert.deepEqual(
    query(env.data(), {
      ...scope,
      includeSubplaces: true,
      includeSubfolders: true,
    }).map((i) => i.id),
    [id],
  );
  assert.equal(
    query(env.data(), {
      ...scope,
      includeSubplaces: false,
      includeSubfolders: true,
    }).length,
    0,
  );
  assert.equal(
    query(env.data(), {
      ...scope,
      includeSubplaces: true,
      includeSubfolders: false,
    }).length,
    0,
  );
});
test('random picks respect their supplied scope, exclude archive/trash, and avoid immediate repeats', () => {
  const data = withDemo(emptyData());
  const pool = data.items.slice(0, 4);
  pool[2].isArchived = true;
  pool[3].deletedAt = '2026-11-17T00:00:00.000Z';
  assert.equal(
    randomItem([], undefined, () => 0),
    undefined,
  );
  assert.equal(
    randomItem(pool.slice(0, 1), pool[0].id, () => 0).id,
    pool[0].id,
  );
  assert.equal(randomItem(pool, pool[0].id, () => 0).id, pool[1].id);
  assert.equal(
    randomItem(pool.slice(2), undefined, () => 0),
    undefined,
  );
});
test('backup v4 retains icons, Trash, grouping and motion; older formats gain safe defaults', async () => {
  const env = await fixture();
  const folder = await env.repo.saveFolder(
    'Kit',
    undefined,
    undefined,
    'bag-outline',
  );
  const place = await env.repo.savePlace(
    'Shelf',
    undefined,
    undefined,
    'albums-outline',
  );
  const id = await env.repo.saveItem(
    draft('Camera', {
      placeId: place,
      folderId: folder,
      icon: 'camera-outline',
    }),
  );
  await env.repo.trashItem(id);
  await env.repo.settings({
    inventoryGroupBy: 'folders',
    reduceAnimations: true,
  });
  const bytes = await createBackup(await env.repo.snapshot(), async () => {
    throw new Error('unused');
  });
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.version, 4);
  const read = await readBackup(bytes);
  assert.equal(read.data.items[0].icon, 'camera-outline');
  assert.ok(read.data.items[0].deletedAt);
  assert.equal(read.data.folders[0].icon, 'bag-outline');
  assert.equal(read.data.places[0].icon, 'albums-outline');
  assert.equal(read.data.settings.inventoryGroupBy, 'folders');
  assert.equal(read.data.settings.reduceAnimations, true);
  for (const version of [1, 2]) {
    const old = structuredClone(manifest);
    old.version = version;
    delete old.data.items[0].deletedAt;
    delete old.data.items[0].icon;
    delete old.data.settings.inventoryGroupBy;
    delete old.data.settings.reduceAnimations;
    zip.file('manifest.json', JSON.stringify(old));
    const upgraded = await readBackup(
      await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }),
    );
    assert.equal(upgraded.data.settings.inventoryGroupBy, 'items');
    assert.equal(upgraded.data.settings.reduceAnimations, false);
  }
});
test('every installed icon is reachable through a section and unknown icons fall back safely', () => {
  const installed = require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
  assert.deepEqual([...iconNames].sort(), Object.keys(installed).sort());
  assert.equal(new Set(iconNames).size, iconNames.length);
  assert.ok(commonIcons.every((name) => iconNames.includes(name)));
  assert.ok(iconNames.every((name) => typeof iconSection(name) === 'string'));
  assert.equal(validIcon('missing', 'folder-outline'), 'folder-outline');
  assert.equal(validIcon('camera-outline'), 'camera-outline');
});

test('Home prioritizes compact starred rows, excludes duplicate recent items, and hides an empty starred section', () => {
  const { homeSections } = require('../.test-build/utils/inventory');
  const data = withDemo(emptyData());
  data.items.forEach((item, index) => {
    item.isFavorite = index < 8;
  });
  data.items[0].deletedAt = '2026-11-17T00:00:00.000Z';
  data.items[1].isArchived = true;
  const wide = homeSections(data.items, 2);
  const narrow = homeSections(data.items, 1);
  assert.equal(wide.starred.length, 4);
  assert.equal(narrow.starred.length, 2);
  assert.equal(wide.recent.length, 8);
  assert.ok(wide.starred.every((item) => !item.deletedAt && !item.isArchived));
  assert.ok(
    wide.recent.every(
      (item) => !wide.starred.some((star) => star.id === item.id),
    ),
  );
  assert.deepEqual(
    homeSections(
      data.items.map((item) => ({ ...item, isFavorite: false })),
      2,
    ).starred,
    [],
  );
  assert.equal(homeSections(data.items.slice(2, 3), 2).recent.length, 0);
});
