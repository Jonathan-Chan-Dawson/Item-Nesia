const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { MemoryRepository } = require('../.test-build/repositories/memory');
const { emptyData } = require('../.test-build/types/models');
const {
  createBackup,
  readBackup,
  remapPhotos,
} = require('../.test-build/utils/backup');
const { containedImage, imagePoint } = require('../.test-build/utils/pins');
const { folderPath } = require('../.test-build/utils/folders');
const { readFileSync } = require('node:fs');

test('backup handles full-size browser data URLs and stores photo bytes separately', async () => {
  const env = await fixture();
  const image = readFileSync('assets/icon.png');
  const uri = `data:image/png;base64,${image.toString('base64')}`;
  assert.ok(uri.length > 100000);
  await env.repo.saveItem({
    name: 'Photo test',
    exactSpot: 'Desk',
    photoUri: uri,
    tags: [],
    aliases: [],
  });
  const bytes = await createBackup(await env.repo.snapshot(), async () => ({
    bytes: new Uint8Array(image),
    mime: 'image/png',
  }));
  const restored = await readBackup(bytes);
  assert.equal(restored.photos.size, 1);
  assert.deepEqual(
    [...restored.photos.values()][0].bytes,
    new Uint8Array(image),
  );
  assert.equal(restored.data.items[0].photoUri, 'photos/0.png');
});
async function fixture() {
  let persisted = emptyData();
  let current;
  const adapter = {
    load: async () => structuredClone(persisted),
    save: async (value) => {
      persisted = structuredClone(value);
    },
  };
  const repo = new MemoryRepository(adapter, (value) => {
    current = value;
  });
  await repo.initialize();
  return { repo, adapter, data: () => current };
}
test('folders nest, reparent, reject cycles, persist, and safely dissolve', async () => {
  const env = await fixture();
  const parent = await env.repo.saveFolder('Travel');
  const child = await env.repo.saveFolder('Documents', parent);
  const leaf = await env.repo.saveFolder('Receipts', child);
  const item = await env.repo.saveItem({
    name: 'Passport',
    exactSpot: 'Desk',
    folderId: child,
    tags: [],
    aliases: [],
  });
  assert.equal(
    folderPath(leaf, env.data().folders),
    'Travel › Documents › Receipts',
  );
  await assert.rejects(
    env.repo.saveFolder('Travel', leaf, parent),
    /inside itself/,
  );
  await env.repo.deleteFolder(child);
  assert.equal(env.data().items.find((i) => i.id === item).folderId, parent);
  assert.equal(env.data().folders.find((f) => f.id === leaf).parentId, parent);
  let restored;
  await new MemoryRepository(env.adapter, (value) => {
    restored = value;
  }).initialize();
  assert.equal(restored.items.length, 1);
  assert.equal(restored.folders.length, 2);
});
test('pin coordinates account for letterboxing and resizing', () => {
  const rect = containedImage(400, 300, 200, 400);
  assert.deepEqual(rect, { width: 150, height: 300, left: 125, top: 0 });
  assert.equal(imagePoint(10, 150, rect), undefined);
  assert.deepEqual(imagePoint(200, 150, rect), { x: 0.5, y: 0.5 });
  const small = containedImage(200, 150, 200, 400);
  assert.deepEqual(imagePoint(100, 75, small), { x: 0.5, y: 0.5 });
  assert.deepEqual(imagePoint(0, 50, containedImage(400, 300, 400, 200)), {
    x: 0,
    y: 0,
  });
});
test('pin validation rejects partial or out-of-range pins and preserves valid pins', async () => {
  const env = await fixture();
  const base = {
    name: 'Wallet',
    exactSpot: 'Drawer',
    tags: [],
    aliases: [],
    locationPhotoUri: 'file://drawer.png',
  };
  await assert.rejects(
    env.repo.saveItem({ ...base, locationPinX: 0.5 }),
    /valid spot/,
  );
  await assert.rejects(
    env.repo.saveItem({ ...base, locationPinX: 1.2, locationPinY: 0.5 }),
    /valid spot/,
  );
  await env.repo.saveItem({ ...base, locationPinX: 0.4, locationPinY: 0.7 });
  assert.equal((await env.repo.snapshot()).items[0].locationPinY, 0.7);
});
test('full backup round trip includes shared photo bytes, nested folders, pins, and history', async () => {
  const env = await fixture();
  const folderId = await env.repo.saveFolder('Travel');
  await env.repo.saveItem({
    name: 'Passport',
    exactSpot: 'Drawer',
    folderId,
    aliases: [],
    tags: [],
    photoUri: 'file://photo.png',
    locationPhotoUri: 'file://photo.png',
    locationPinX: 0.2,
    locationPinY: 0.8,
  });
  const photo = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  let reads = 0;
  const bytes = await createBackup(await env.repo.snapshot(), async () => {
    reads++;
    return { bytes: photo, mime: 'image/png' };
  });
  assert.equal(reads, 1);
  const restored = await readBackup(bytes);
  assert.equal(restored.photos.size, 1);
  assert.deepEqual([...restored.photos.values()][0].bytes, photo);
  const map = new Map(
    [...restored.photos.keys()].map((path) => [path, 'file://restored.png']),
  );
  const target = await fixture();
  await target.repo.replace(remapPhotos(restored.data, map));
  assert.equal(target.data().items[0].photoUri, 'file://restored.png');
  assert.equal(target.data().items[0].locationPhotoUri, 'file://restored.png');
  assert.equal(target.data().items[0].locationPinX, 0.2);
  assert.equal(target.data().folders[0].id, folderId);
  assert.equal(target.data().history.length, 1);
});
test('backup fails rather than silently excluding unreadable photos', async () => {
  const env = await fixture();
  await env.repo.saveItem({
    name: 'Wallet',
    exactSpot: 'Desk',
    aliases: [],
    tags: [],
    photoUri: 'missing',
  });
  await assert.rejects(
    createBackup(env.data(), async () => {
      throw new Error('Photo missing');
    }),
    /Photo missing/,
  );
});
test('restore rejects missing assets, newer formats, cycles, and compressed foreign archives', async () => {
  const bytes = await createBackup(emptyData(), async () => {
    throw new Error('unused');
  });
  for (const kind of ['missing', 'newer', 'cycle']) {
    const zip = await JSZip.loadAsync(bytes);
    const manifest = JSON.parse(
      await zip.file('manifest.json').async('string'),
    );
    if (kind === 'missing')
      manifest.photos.push({ path: 'photos/0.png', mime: 'image/png' });
    if (kind === 'newer') manifest.version = 99;
    if (kind === 'cycle') {
      const now = new Date().toISOString();
      manifest.data.folders.push({
        id: 'a',
        name: 'A',
        parentId: 'a',
        createdAt: now,
        updatedAt: now,
      });
    }
    zip.file('manifest.json', JSON.stringify(manifest));
    await assert.rejects(
      readBackup(
        await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }),
      ),
    );
  }
  const foreign = new JSZip();
  foreign.file('manifest.json', '{}');
  await assert.rejects(
    readBackup(
      await foreign.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
      }),
    ),
  );
});
test('failed restore storage commit leaves original data untouched', async () => {
  let fail = false;
  let current;
  const adapter = {
    load: async () => emptyData(),
    save: async () => {
      if (fail) throw new Error('Quota');
    },
  };
  const repo = new MemoryRepository(adapter, (data) => {
    current = data;
  });
  await repo.initialize();
  await repo.saveItem({
    name: 'Keep me',
    exactSpot: 'Desk',
    tags: [],
    aliases: [],
  });
  fail = true;
  await assert.rejects(repo.replace(emptyData()), /Quota/);
  assert.equal(current.items[0].name, 'Keep me');
});
