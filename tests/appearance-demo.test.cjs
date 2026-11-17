const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryRepository } = require('../.test-build/repositories/memory');
const { demoStorage } = require('../.test-build/database/demo-session');
const { emptyData } = require('../.test-build/types/models');
const { normalizeSettings } = require('../.test-build/utils/preferences');
const { validateBackupData } = require('../.test-build/utils/backup');
const { colorThemes } = require('../.test-build/theme/appearance');

test('every palette and appearance survives persistence and backup validation; older settings stay compatible', async () => {
  let saved = emptyData();
  const adapter = {
    load: async () => structuredClone(saved),
    save: async (data) => {
      saved = structuredClone(data);
    },
  };
  for (const colorTheme of colorThemes) {
    for (const theme of ['system', 'light', 'dark']) {
      const repo = new MemoryRepository(adapter, () => {});
      await repo.initialize();
      await repo.settings({ colorTheme, theme });
      let restarted;
      await new MemoryRepository(adapter, (data) => {
        restarted = data;
      }).initialize();
      assert.equal(restarted.settings.colorTheme, colorTheme);
      assert.equal(validateBackupData(restarted).settings.theme, theme);
      assert.equal(
        validateBackupData(restarted).settings.colorTheme,
        colorTheme,
      );
    }
  }
  assert.equal(
    normalizeSettings({ theme: 'dark' }, emptyData()).colorTheme,
    'mint',
  );
  assert.equal(
    normalizeSettings({ colorTheme: 'unknown' }, emptyData()).colorTheme,
    'mint',
  );
});

test('demo edits, settings, and exit never write to the personal collection; reentry starts fresh', async () => {
  const personal = emptyData();
  personal.settings.colorTheme = 'harbor';
  personal.settings.quickAccess = [{ kind: 'place', id: 'personal-place' }];
  const before = structuredClone(personal);
  let demo;
  const repo = new MemoryRepository(demoStorage(personal.settings), (data) => {
    demo = data;
  });
  await repo.initialize();
  assert.equal(demo.items.length, 60);
  assert.equal(demo.settings.colorTheme, 'harbor');
  assert.deepEqual(demo.settings.quickAccess, []);
  await repo.saveItem({
    name: 'Only in demo',
    exactSpot: 'Test shelf',
    aliases: [],
    tags: [],
  });
  await repo.settings({ colorTheme: 'berry', theme: 'dark' });
  await repo.clear();
  assert.equal(demo.items.length, 0);
  assert.deepEqual(personal, before);
  await new MemoryRepository(demoStorage(personal.settings), (data) => {
    demo = data;
  }).initialize();
  assert.equal(demo.items.length, 60);
  assert.equal(demo.settings.colorTheme, 'harbor');
  assert.ok(demo.items.every((item) => item.name !== 'Only in demo'));
});
