import type { ColorTheme } from '../theme/appearance';
export const categories = [
  'Electronics',
  'Documents',
  'Accessories',
  'Clothing',
  'Household',
  'Kitchen & Dining',
  'Tools',
  'Hobbies',
  'Other',
  'Personal Care',
  'Health & Wellness',
  'Sports & Outdoors',
  'Stationery',
  'Pet Supplies',
  'Cleaning & Laundry',
  'Seasonal',
] as const;
export type Category = (typeof categories)[number];
export interface Item {
  icon?: string;
  deletedAt?: string;
  id: string;
  name: string;
  description?: string;
  category?: Category;
  aliases: string[];
  tags: string[];
  photoUri?: string;
  locationPhotoUri?: string;
  placeId?: string;
  folderId?: string;
  exactSpot?: string;
  locationPinX?: number;
  locationPinY?: number;
  isFavorite: boolean;
  isArchived: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  locationUpdatedAt: string;
}
export interface Place {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  icon?: string;
  coverPhotoUri?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Folder {
  icon?: string;
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface LocationSnapshot {
  placeId?: string;
  path: string;
  position?: string;
  photoUri?: string;
  pinX?: number;
  pinY?: number;
}
export interface LocationHistory {
  previousLocation?: LocationSnapshot;
  newLocation?: LocationSnapshot;
  previousLocationUpdatedAt?: string;
  id: string;
  itemId: string;
  previousPlaceId?: string;
  newPlaceId?: string;
  previousSpot?: string;
  newSpot?: string;
  changedAt: string;
  note?: string;
}
export interface Settings {
  reduceAnimations?: boolean;
  inventoryGroupBy?: 'items' | 'folders' | 'places' | 'categories';
  theme: 'system' | 'light' | 'dark';
  colorTheme?: ColorTheme;
  defaultItemsView: 'grid' | 'list';
  homeItemsView?: 'grid' | 'list';
  hapticsEnabled: boolean;
  onboardingCompleted: boolean;
  demoInitialized: boolean;
  quickAccess: QuickAccessRef[];
}
export interface QuickAccessRef {
  kind: 'place' | 'folder';
  id: string;
}
export interface MemoryData {
  items: Item[];
  places: Place[];
  folders: Folder[];
  history: LocationHistory[];
  settings: Settings;
}
export type ItemDraft = Pick<
  Item,
  | 'name'
  | 'icon'
  | 'description'
  | 'category'
  | 'aliases'
  | 'tags'
  | 'photoUri'
  | 'locationPhotoUri'
  | 'placeId'
  | 'exactSpot'
  | 'folderId'
  | 'locationPinX'
  | 'locationPinY'
>;
export const defaultSettings: Settings = {
  theme: 'system',
  colorTheme: 'mint',
  defaultItemsView: 'grid',
  homeItemsView: 'grid',
  hapticsEnabled: true,
  onboardingCompleted: false,
  demoInitialized: false,
  quickAccess: [],
};
export const emptyData = (): MemoryData => ({
  items: [],
  places: [],
  folders: [],
  history: [],
  settings: { ...defaultSettings, quickAccess: [] },
});
