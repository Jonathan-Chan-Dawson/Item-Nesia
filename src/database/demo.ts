import type { Item, MemoryData, Place } from '../types/models';

export function withDemo(data: MemoryData): MemoryData {
  const now = new Date().toISOString();
  const names = [
    'Bedroom',
    'Kitchen',
    'Living Room',
    'Office',
    'Garage',
    'Car',
    'Backpack',
  ];
  const places: Place[] = names.map((name, index) => ({
    id: `demo-place-${index}`,
    name,
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  }));
  places.push(
    {
      id: 'demo-dresser',
      name: 'Dresser',
      parentId: 'demo-place-0',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-desk',
      name: 'Desk',
      parentId: 'demo-place-3',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  );
  const entries: [string, Item['category'], string, string, string[]][] = [
    [
      'Blue Wallet',
      'Accessories',
      'demo-dresser',
      'Top drawer, behind the shirts',
      ['wallet', 'cards'],
    ],
    [
      'USB-C Cable',
      'Electronics',
      'demo-desk',
      'Left drawer',
      ['charger', 'cable'],
    ],
    ['Passport', 'Documents', 'demo-dresser', 'Document folder', ['travel']],
    [
      'Spare Keys',
      'Accessories',
      'demo-place-1',
      'Small bowl by the door',
      ['keys'],
    ],
    [
      'Bluetooth Headphones',
      'Electronics',
      'demo-place-6',
      'Front pocket',
      ['music'],
    ],
    ['Camera Battery', 'Electronics', 'demo-desk', 'Camera case', ['camera']],
    [
      'Portable Charger',
      'Electronics',
      'demo-place-6',
      'Inner pocket',
      ['charger'],
    ],
    [
      'Sunglasses',
      'Accessories',
      'demo-place-5',
      'Glove compartment',
      ['glasses'],
    ],
    ['Winter Gloves', 'Clothing', 'demo-dresser', 'Bottom drawer', ['winter']],
    ['Measuring Tape', 'Tools', 'demo-place-4', 'Toolbox', ['tape']],
    ['Flash Drive', 'Electronics', 'demo-desk', 'Left drawer', ['usb']],
    ['Old Phone', 'Electronics', 'demo-desk', 'Tech box', ['phone']],
    ['Nintendo Controller', 'Hobbies', 'demo-place-2', 'TV cabinet', ['games']],
    [
      'Holiday Decorations',
      'Household',
      'demo-place-4',
      'Labeled green box',
      ['holiday'],
    ],
    [
      'Important Receipt',
      'Documents',
      'demo-dresser',
      'Document folder',
      ['receipt'],
    ],
  ];
  const items: Item[] = entries.map(
    ([name, category, placeId, exactSpot, tags], index) => ({
      id: `demo-item-${index}`,
      name,
      category,
      placeId,
      exactSpot,
      tags,
      aliases: [],
      isFavorite: index < 3,
      isArchived: false,
      isDemo: true,
      createdAt: new Date(Date.now() - index * 60000).toISOString(),
      updatedAt: new Date(Date.now() - index * 60000).toISOString(),
      locationUpdatedAt: now,
    }),
  );
  // Never replace existing records, including demo records the user has edited.
  const demoHistory = {
    id: 'demo-history-wallet',
    itemId: 'demo-item-0',
    previousPlaceId: 'demo-place-6',
    newPlaceId: 'demo-dresser',
    previousSpot: 'Front pocket',
    newSpot: 'Top drawer, behind the shirts',
    changedAt: now,
    note: 'Example location change',
  };
  return {
    ...data,
    places: [
      ...data.places,
      ...places.filter(
        (p) => !data.places.some((existing) => existing.id === p.id),
      ),
    ],
    items: [
      ...data.items,
      ...items.filter(
        (i) => !data.items.some((existing) => existing.id === i.id),
      ),
    ],
    history: data.history.some((h) => h.id === demoHistory.id)
      ? data.history
      : [demoHistory, ...data.history],
    settings: { ...data.settings, demoInitialized: true },
  };
}
