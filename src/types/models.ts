export const categories = [
  'Electronics',
  'Documents',
  'Accessories',
  'Clothing',
  'Household',
  'Tools',
  'Hobbies',
  'Other',
] as const;
export type Category = (typeof categories)[number];
export interface Item {
  id: string;
  name: string;
  description?: string;
  category?: Category;
  aliases: string[];
  tags: string[];
  photoUri?: string;
  locationPhotoUri?: string;
  placeId?: string;
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
export interface LocationHistory {
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
  theme: 'system' | 'light' | 'dark';
  defaultItemsView: 'grid' | 'list';
  hapticsEnabled: boolean;
  onboardingCompleted: boolean;
  demoInitialized: boolean;
}
export interface MemoryData {
  items: Item[];
  places: Place[];
  history: LocationHistory[];
  settings: Settings;
}
export type ItemDraft = Pick<
  Item,
  | 'name'
  | 'description'
  | 'category'
  | 'aliases'
  | 'tags'
  | 'photoUri'
  | 'locationPhotoUri'
  | 'placeId'
  | 'exactSpot'
>;
export const defaultSettings: Settings = {
  theme: 'system',
  defaultItemsView: 'grid',
  hapticsEnabled: true,
  onboardingCompleted: false,
  demoInitialized: false,
};
export const emptyData = (): MemoryData => ({
  items: [],
  places: [],
  history: [],
  settings: { ...defaultSettings },
});
