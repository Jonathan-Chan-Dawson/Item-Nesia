const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { MemoryRepository } = require('../.test-build/repositories/memory');
const { emptyData } = require('../.test-build/types/models');
const {
  locationSnapshot,
  locationKey,
  changePlace,
  positionSuggestions,
  suggestedDestinations,
} = require('../.test-build/utils/locations');
const {
  createBackup,
  readBackup,
  remapPhotos,
  validateBackupData,
} = require('../.test-build/utils/backup');
async function setup() {
  let saved = emptyData(),
    data,
    fail = false;
  const removed = [];
  const adapter = {
    load: async () => structuredClone(saved),
    save: async (value) => {
      if (fail) throw new Error('Disk full');
      saved = structuredClone(value);
    },
  };
  const repo = new MemoryRepository(
    adapter,
    (value) => {
      data = value;
    },
    async (uri) => {
      removed.push(uri);
    },
  );
  await repo.initialize();
  const bathroom = await repo.savePlace('Bathroom');
  const garage = await repo.savePlace('Garage');
  const id = await repo.saveItem({
    name: 'Shampoo',
    category: 'Personal Care',
    placeId: bathroom,
    exactSpot: 'Under sink',
    locationPhotoUri: 'file://old.jpg',
    locationPinX: 0.2,
    locationPinY: 0.8,
    aliases: [],
    tags: [],
  });
  const item = () => data.items.find((item) => item.id === id);
  const expected = () => ({
    updatedAt: item().locationUpdatedAt,
    key: locationKey(locationSnapshot(item(), data.places)),
  });
  const move = () =>
    repo.moveItem(
      id,
      {
        placeId: garage,
        path: 'Ignored incoming label',
        position: ' Blue   bin ',
        photoUri: 'file://new.jpg',
        pinX: 0.5,
        pinY: 0.6,
      },
      expected(),
    );
  return {
    repo,
    adapter,
    data: () => data,
    item,
    expected,
    move,
    id,
    bathroom,
    garage,
    removed,
    fail: (value) => {
      fail = value;
    },
  };
}
test('changing places clears stale position, photo and pin; selecting the same place preserves them', async () => {
  const env = await setup();
  const snapshot = locationSnapshot(env.item(), env.data().places);
  assert.equal(
    changePlace(snapshot, env.bathroom, env.data().places),
    snapshot,
  );
  assert.deepEqual(changePlace(snapshot, env.garage, env.data().places), {
    placeId: env.garage,
    path: 'Garage',
  });
  assert.deepEqual(changePlace(snapshot, undefined, env.data().places), {
    placeId: undefined,
    path: '',
  });
});
test('moves retain old/new photo snapshots, normalize position and persist captured paths', async () => {
  const env = await setup();
  const result = await env.move();
  const entry = env.data().history[0];
  assert.equal(entry.id, result.historyId);
  assert.equal(result.changed, true);
  assert.equal(entry.previousLocation.path, 'Bathroom');
  assert.equal(entry.previousLocation.photoUri, 'file://old.jpg');
  assert.equal(entry.previousLocation.pinX, 0.2);
  assert.equal(entry.newLocation.path, 'Garage');
  assert.equal(entry.newLocation.position, 'Blue bin');
  assert.equal(entry.newLocation.pinY, 0.6);
  await env.repo.savePlace('Workshop', undefined, env.garage);
  assert.equal(env.data().history[0].newLocation.path, 'Garage');
  let reloaded;
  await new MemoryRepository(env.adapter, (value) => {
    reloaded = value;
  }).initialize();
  assert.deepEqual(reloaded.history, env.data().history);
});
test('location-only saves preserve newer metadata; stale and repeated move requests are rejected atomically', async () => {
  const env = await setup();
  const expected = env.expected();
  await env.repo.saveItem(
    { ...env.item(), name: 'Renamed shampoo', tags: ['bath'] },
    env.id,
  );
  await env.repo.moveItem(
    env.id,
    { placeId: env.garage, path: '', position: 'Shelf' },
    expected,
  );
  assert.equal(env.item().name, 'Renamed shampoo');
  assert.deepEqual(env.item().tags, ['bath']);
  const before = await env.repo.snapshot();
  await assert.rejects(
    env.repo.moveItem(env.id, { path: '', position: 'Desk' }, expected),
    /location changed/,
  );
  assert.deepEqual(await env.repo.snapshot(), before);
});
test('unchanged normalized locations create no history entry and invalid destinations leave the item intact', async () => {
  const env = await setup();
  const count = env.data().history.length;
  const result = await env.repo.moveItem(
    env.id,
    {
      ...locationSnapshot(env.item(), env.data().places),
      position: ' Under   sink ',
    },
    env.expected(),
  );
  assert.equal(result.changed, false);
  assert.equal(env.data().history.length, count);
  const before = await env.repo.snapshot();
  await assert.rejects(
    env.repo.moveItem(env.id, { path: '', position: ' ' }, env.expected()),
    /place|spot/,
  );
  assert.deepEqual(await env.repo.snapshot(), before);
});
test('Undo restores location and timestamp, removes only that entry and preserves unrelated edits', async () => {
  const env = await setup();
  const original = structuredClone(env.item());
  const count = env.data().history.length;
  const result = await env.move();
  await env.repo.saveItem({ ...env.item(), name: 'Edited later' }, env.id);
  await env.repo.updateItem(env.id, { isFavorite: true });
  await env.repo.undoMove(env.id, result.historyId);
  assert.equal(env.item().placeId, original.placeId);
  assert.equal(env.item().exactSpot, original.exactSpot);
  assert.equal(env.item().locationPhotoUri, original.locationPhotoUri);
  assert.equal(env.item().locationUpdatedAt, original.locationUpdatedAt);
  assert.equal(env.item().name, 'Edited later');
  assert.equal(env.item().isFavorite, true);
  assert.equal(env.data().history.length, count);
  await assert.rejects(env.repo.undoMove(env.id, result.historyId), /Undo/);
});
test('history deletion and clear-all never change the current item and safely release orphan photos', async () => {
  const env = await setup();
  const initial = env.data().history[0].id;
  const result = await env.move();
  const current = structuredClone(env.item());
  await env.repo.deleteHistoryEntry(env.id, initial);
  assert.deepEqual(env.removed, []);
  assert.deepEqual(env.item(), current);
  await env.repo.deleteHistoryEntry(env.id, result.historyId);
  assert.deepEqual(env.removed, ['file://old.jpg']);
  assert.deepEqual(env.item(), current);
  await env.repo.clearHistory(env.id);
  assert.deepEqual(env.item(), current);
  assert.equal(env.data().history.length, 0);
  await assert.rejects(env.repo.undoMove(env.id, result.historyId), /Undo/);
});
test('failed writes leave moves/history published state intact and later mutations still succeed', async () => {
  const env = await setup();
  const before = await env.repo.snapshot();
  env.fail(true);
  await assert.rejects(env.move(), /Disk full/);
  await assert.rejects(env.repo.clearHistory(env.id), /Disk full/);
  assert.deepEqual(await env.repo.snapshot(), before);
  assert.deepEqual(env.removed, []);
  env.fail(false);
  assert.equal((await env.move()).changed, true);
});
test('clearing one item history preserves shared photos and other items history', async () => {
  const env = await setup();
  await env.move();
  const other = await env.repo.saveItem({
    name: 'Other',
    exactSpot: 'Desk',
    locationPhotoUri: 'file://old.jpg',
    aliases: [],
    tags: [],
  });
  const otherHistory = env
    .data()
    .history.filter((entry) => entry.itemId === other);
  await env.repo.clearHistory(env.id);
  assert.deepEqual(
    env.data().history,
    JSON.parse(JSON.stringify(otherHistory)),
  );
  assert.deepEqual(env.removed, []);
  await env.repo.deleteItem(other);
  assert.ok(env.removed.includes('file://old.jpg'));
});
test('suggestions are bounded, local, deduplicated and exclude archived/trashed owners and current destination', async () => {
  const env = await setup();
  await env.move();
  const a = await env.repo.saveItem({
    name: 'Soap',
    category: 'Personal Care',
    placeId: env.bathroom,
    exactSpot: 'Top shelf',
    aliases: [],
    tags: [],
  });
  const b = await env.repo.saveItem({
    name: 'Hidden',
    placeId: env.garage,
    exactSpot: 'Secret',
    aliases: [],
    tags: [],
  });
  await env.repo.trashItem(b);
  const values = suggestedDestinations(env.data(), env.item());
  assert.ok(values.length <= 4);
  assert.equal(new Set(values.map(locationKey)).size, values.length);
  assert.ok(values.some((value) => value.position === 'Top shelf'));
  assert.ok(
    !values.some(
      (value) => value.position === 'Secret' || value.position === 'Blue bin',
    ),
  );
  assert.ok(
    positionSuggestions(env.data(), env.bathroom, 'top').includes('Top shelf'),
  );
  assert.ok(
    !positionSuggestions(env.data(), env.garage, '').includes('Secret'),
  );
  await env.repo.updateItem(a, { isArchived: true });
  assert.ok(
    !suggestedDestinations(env.data(), env.item()).some(
      (value) => value.position === 'Top shelf',
    ),
  );
});
test('backup v4 includes historical assets, pins and captured paths and rejects invalid snapshots', async () => {
  const env = await setup();
  await env.move();
  const bytes = await createBackup(await env.repo.snapshot(), async () => ({
    bytes: Uint8Array.from([1, 2, 3]),
    mime: 'image/jpeg',
  }));
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.version, 4);
  const restored = await readBackup(bytes);
  assert.equal(restored.photos.size, 2);
  const paths = new Map(
    [...restored.photos.keys()].map((path) => [
      path,
      'file://restored-' + path,
    ]),
  );
  const data = remapPhotos(restored.data, paths);
  assert.ok(
    data.history[0].previousLocation.photoUri.startsWith('file://restored-'),
  );
  assert.equal(data.history[0].newLocation.pinX, 0.5);
  assert.equal(data.history[0].previousLocation.path, 'Bathroom');
  const invalid = structuredClone(data);
  invalid.history[0].previousLocation.pinX = 2;
  assert.throws(() => validateBackupData(invalid), /backup/);
  for (const version of [1, 2, 3]) {
    const old = structuredClone(manifest);
    old.version = version;
    zip.file('manifest.json', JSON.stringify(old));
    assert.equal(
      (
        await readBackup(
          await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }),
        )
      ).data.items.length,
      1,
    );
  }
});

test('legacy text-only history participates in local destination and position suggestions', async () => {
  const env = await setup();
  const data = structuredClone(env.data());
  data.history.unshift({
    id: 'legacy',
    itemId: env.id,
    newPlaceId: env.garage,
    newSpot: 'Old shelf',
    changedAt: '2026-01-01T00:00:00.000Z',
  });
  assert.ok(
    suggestedDestinations(data, env.item()).some(
      (value) => value.position === 'Old shelf',
    ),
  );
  assert.ok(positionSuggestions(data, env.garage, 'old').includes('Old shelf'));
});
