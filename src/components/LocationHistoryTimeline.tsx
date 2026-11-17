import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMemory, useTheme } from '../hooks/useMemory';
import { placePath } from '../utils/memory';
import type { LocationHistory } from '../types/models';
import { Copy, ErrorMessage, Icon, Section, confirm, s } from './ui';
import { OverflowMenu } from './OverflowMenu';
import { LocationSummary } from './LocationSummary';
import { Reveal } from './Reveal';
function HistoryEntry({
  entry,
  onDelete,
}: {
  entry: LocationHistory;
  onDelete(): void;
}) {
  const { data } = useMemory();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const destination = entry.newLocation ?? {
    placeId: entry.newPlaceId,
    path: placePath(entry.newPlaceId, data.places),
    position: entry.newSpot,
  };
  const previous =
    entry.previousLocation ??
    (entry.previousPlaceId || entry.previousSpot
      ? {
          placeId: entry.previousPlaceId,
          path: placePath(entry.previousPlaceId, data.places),
          position: entry.previousSpot,
        }
      : undefined);
  return (
    <View style={{ gap: 8 }}>
      <View style={[s.row, { gap: 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${destination.path || 'Position only'}, ${destination.position ?? ''}, ${new Date(entry.changedAt).toLocaleString()}`}
          onPress={() => setExpanded(!expanded)}
          style={{
            flex: 1,
            minHeight: 56,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <Icon name="location-outline" size={18} />
          <View style={{ flex: 1 }}>
            <Copy
              numberOfLines={2}
              style={{ fontSize: 13, fontWeight: '600', lineHeight: 18 }}
            >
              {[destination.path, destination.position]
                .filter(Boolean)
                .join(' · ') || 'Recorded location'}
            </Copy>
            <Copy muted style={{ fontSize: 11 }}>
              {new Date(entry.changedAt).toLocaleString()}
            </Copy>
          </View>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} />
        </Pressable>
        <OverflowMenu
          title="History entry"
          options={[
            { value: 'delete', label: 'Delete entry', icon: 'trash-outline' },
          ]}
          onSelect={onDelete}
        />
      </View>
      {expanded && (
        <Reveal>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: colors.soft,
            }}
          >
            {previous && (
              <View style={{ flex: 1 }}>
                <LocationSummary stacked snapshot={previous} label="From" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <LocationSummary
                stacked
                snapshot={destination}
                label={previous ? 'To' : 'Saved location'}
              />
            </View>
          </View>
        </Reveal>
      )}
    </View>
  );
}
export function LocationHistoryTimeline({ itemId }: { itemId: string }) {
  const { data, repository } = useMemory();
  const [all, setAll] = useState(false);
  const [error, setError] = useState<string>();
  const entries = data.history
    .filter((entry) => entry.itemId === itemId)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  const run = (work: Promise<unknown>) => {
    setError(undefined);
    void work.catch((e) => setError(e.message));
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Section
            title="Location history"
            action={
              entries.length > 3 ? (all ? 'Show less' : 'View all') : undefined
            }
            onPress={() => setAll(!all)}
          />
        </View>
        {!!entries.length && (
          <OverflowMenu
            title="Location history"
            options={[
              { value: 'clear', label: 'Clear history', icon: 'trash-outline' },
            ]}
            onSelect={() => {
              void confirm(
                'Clear location history?',
                'This deletes this item’s history and photos used only by those entries. Its current location and current photo stay the same.',
              ).then((yes) => {
                if (yes) run(repository.clearHistory(itemId));
              });
            }}
          />
        )}
      </View>
      <ErrorMessage message={error} />
      {!entries.length ? (
        <Copy muted style={{ fontSize: 13 }}>
          No location history. The current saved location stays above.
        </Copy>
      ) : (
        (all ? entries : entries.slice(0, 3)).map((entry) => (
          <HistoryEntry
            key={entry.id}
            entry={entry}
            onDelete={() => {
              void confirm(
                'Delete history entry?',
                'The current location stays the same. Photos used only by this entry will be removed.',
              ).then((yes) => {
                if (yes) run(repository.deleteHistoryEntry(itemId, entry.id));
              });
            }}
          />
        ))
      )}
    </View>
  );
}
