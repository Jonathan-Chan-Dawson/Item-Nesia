import type { Item, MemoryData, Place, Folder } from '../types/models';

export const DEMO_ITEM_COUNT = 60;

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
    'Bathroom',
    'Attic',
    'Outdoors',
    'Laundry Room',
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
    [
      'Chef knife',
      'Kitchen & Dining',
      'demo-place-1',
      'Knife block beside the stove',
      ['cooking'],
    ],
    [
      'Measuring cups',
      'Kitchen & Dining',
      'demo-place-1',
      'Lower baking drawer',
      ['baking'],
    ],
    [
      'Cast iron skillet',
      'Kitchen & Dining',
      'demo-place-1',
      'Bottom cabinet',
      ['pan'],
    ],
    [
      'Camping spatula',
      'Kitchen & Dining',
      'demo-place-4',
      'Camping box',
      ['camping', 'cooking'],
    ],
    [
      'Food thermometer',
      'Kitchen & Dining',
      'demo-place-1',
      'Utensil drawer',
      ['temperature'],
    ],
    [
      'Hair clippers',
      'Accessories',
      'demo-dresser',
      'Grooming pouch',
      ['haircut', 'grooming'],
    ],
    [
      'Hair scissors',
      'Accessories',
      'demo-dresser',
      'Small grooming pouch',
      ['haircut'],
    ],
    [
      'Car registration',
      'Documents',
      'demo-place-5',
      'Glove compartment envelope',
      ['car'],
    ],
    [
      'Tire pressure gauge',
      'Tools',
      'demo-place-5',
      'Door pocket',
      ['car', 'tires'],
    ],
    [
      'Jumper cables',
      'Tools',
      'demo-place-5',
      'Trunk emergency kit',
      ['car', 'emergency'],
    ],
    [
      'Picnic blanket',
      'Household',
      'demo-place-5',
      'Trunk side compartment',
      ['outdoors'],
    ],
    [
      'Sewing kit',
      'Hobbies',
      'demo-dresser',
      'Small tin in middle drawer',
      ['repair'],
    ],
    ['Watercolor paints', 'Hobbies', 'demo-desk', 'Art supply box', ['art']],
    [
      'Travel adapter',
      'Electronics',
      'demo-place-6',
      'Zipped mesh pocket',
      ['travel', 'plug'],
    ],
    [
      'Reusable shopping bags',
      'Household',
      'demo-place-5',
      'Trunk organizer',
      ['shopping'],
    ],
    [
      'Shampoo refill',
      'Personal Care',
      'demo-place-7',
      'Under sink',
      ['grooming'],
    ],
    [
      'Electric toothbrush',
      'Personal Care',
      'demo-place-7',
      'Mirror cabinet',
      ['dental'],
    ],
    [
      'First aid kit',
      'Health & Wellness',
      'demo-place-4',
      'Marked red box',
      ['emergency'],
    ],
    [
      'Digital thermometer',
      'Health & Wellness',
      'demo-place-7',
      'Mirror cabinet',
      ['health'],
    ],
    [
      'Yoga mat',
      'Sports & Outdoors',
      'demo-place-9',
      'Covered storage bench',
      ['exercise'],
    ],
    [
      'Bike helmet',
      'Sports & Outdoors',
      'demo-place-4',
      'Hook beside bike',
      ['cycling'],
    ],
    ['Fountain pen', 'Stationery', 'demo-desk', 'Pen tray', ['writing']],
    ['Sticky notes', 'Stationery', 'demo-desk', 'Right drawer', ['office']],
    [
      'Dog leash',
      'Pet Supplies',
      'demo-place-2',
      'Hook by front door',
      ['pets'],
    ],
    ['Pet brush', 'Pet Supplies', 'demo-place-10', 'Utility basket', ['pets']],
    [
      'Microfiber cloths',
      'Cleaning & Laundry',
      'demo-place-10',
      'Cleaning caddy',
      ['cleaning'],
    ],
    [
      'Lint roller',
      'Cleaning & Laundry',
      'demo-place-10',
      'Shelf by dryer',
      ['laundry'],
    ],
    ['String lights', 'Seasonal', 'demo-place-8', 'Holiday box', ['holiday']],
    [
      'Gift wrapping kit',
      'Seasonal',
      'demo-place-8',
      'Long storage tub',
      ['gifts'],
    ],
    ['Keepsake stone', 'Other', 'demo-place-0', 'Memory box', ['keepsake']],
    ['Mystery adapter', 'Other', 'demo-desk', 'Unsorted tray', ['spare']],
    [
      'Rain jacket',
      'Clothing',
      'demo-place-6',
      'Main compartment',
      ['outdoors'],
    ],
    ['Travel pillow', 'Accessories', 'demo-place-8', 'Travel tote', ['travel']],
    [
      'Lunch container',
      'Kitchen & Dining',
      'demo-place-1',
      'Shelf beside fridge',
      ['lunch'],
    ],
    [
      'Silicone baking mat',
      'Kitchen & Dining',
      'demo-place-1',
      'Baking drawer',
      ['baking'],
    ],
    [
      'Insurance papers',
      'Documents',
      'demo-dresser',
      'Document folder',
      ['papers'],
    ],
    [
      'Waterproof pouch',
      'Accessories',
      'demo-place-6',
      'Inner pocket',
      ['travel'],
    ],
    ['Knitting needles', 'Hobbies', 'demo-place-2', 'Craft basket', ['craft']],
    ['Socket set', 'Tools', 'demo-place-4', 'Toolbox bottom tray', ['repair']],
    ['HDMI adapter', 'Electronics', 'demo-desk', 'Tech box', ['cable']],
    ['Tent repair kit', 'Tools', 'demo-place-4', 'Camping box', ['camping']],
    [
      'Sleeping bag',
      'Sports & Outdoors',
      'demo-place-8',
      'Camping tote',
      ['camping'],
    ],
    [
      'Spare pillowcase',
      'Household',
      'demo-dresser',
      'Linen drawer',
      ['linen'],
    ],
    [
      'Foldable umbrella',
      'Accessories',
      'demo-place-6',
      'Side pocket',
      ['rain'],
    ],
    ['Notebook', 'Stationery', 'demo-desk', 'Top shelf', ['writing']],
  ];
  const items: Item[] = entries.map(
    ([name, category, placeId, exactSpot, tags], index) => ({
      id: `demo-item-${index}`,
      name,
      category,
      placeId,
      folderId: index < 54 ? demoFolderFor(name, category, tags) : undefined,
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
  const folders: Folder[] = demoFolders.map((name, index) => ({
    id: `demo-folder-${index}`,
    name,
    createdAt: now,
    updatedAt: now,
  }));
  return {
    ...data,
    folders: [
      ...data.folders,
      ...folders.filter(
        (folder) => !data.folders.some((old) => old.id === folder.id),
      ),
    ],
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

export const demoFolders = [
  'Everyday Carry',
  'Travel',
  'Camping',
  'Car Kit',
  'Home Maintenance',
  'Creative Projects',
  'Seasonal Storage',
  'Important Papers',
];
function demoFolderFor(
  name: string,
  category: Item['category'],
  tags: string[],
) {
  const index =
    category === 'Documents'
      ? 7
      : tags.includes('camping')
        ? 2
        : tags.includes('car')
          ? 3
          : tags.includes('travel')
            ? 1
            : category === 'Hobbies' || category === 'Stationery'
              ? 5
              : category === 'Seasonal' || tags.includes('holiday')
                ? 6
                : /wallet|keys|headphones|charger|glasses|gloves/i.test(name)
                  ? 0
                  : 4;
  return `demo-folder-${index}`;
}
export function organizeDemo(data: MemoryData): MemoryData {
  const seeded = withDemo(data);
  const fresh = withDemo({ ...data, items: [], history: [] });
  const defaults = new Map(fresh.items.map((item) => [item.id, item]));
  return {
    ...data,
    folders: seeded.folders,
    items: data.items.map((item) =>
      item.isDemo && !item.folderId && !item.deletedAt && defaults.has(item.id)
        ? { ...item, folderId: defaults.get(item.id)!.folderId }
        : item,
    ),
  };
}
