import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { Item } from '../types/models';
import { useMemory, useTheme } from '../hooks/useMemory';
import { Copy, Icon, s, type IconName } from './ui';
export function ItemCardActions({
  item,
  onTrash,
}: {
  item: Item;
  onTrash?(item: Item): void;
}) {
  const { repository } = useMemory();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    height: number;
  }>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const options: { value: string; label: string; icon: IconName }[] =
    item.deletedAt
      ? []
      : [
          { value: 'edit', label: 'Edit item', icon: 'create-outline' },
          {
            value: 'archive',
            label: item.isArchived ? 'Restore from Archive' : 'Archive',
            icon: 'archive-outline',
          },
          { value: 'trash', label: 'Move to Trash', icon: 'trash-outline' },
        ];
  async function select(value: string) {
    if (value === 'edit') {
      setAnchor(undefined);
      router.push({ pathname: '/items/edit/[id]', params: { id: item.id } });
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      if (value === 'trash') {
        await repository.trashItem(item.id);
        onTrash?.(item);
      } else if (value === 'star')
        await repository.updateItem(item.id, { isFavorite: !item.isFavorite });
      else
        await repository.updateItem(item.id, { isArchived: !item.isArchived });
      setAnchor(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View ref={trigger} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${item.name}`}
          accessibilityState={{ expanded: !!anchor }}
          disabled={!!item.deletedAt}
          onPress={(event) => {
            event.stopPropagation();
            setError(undefined);
            trigger.current?.measureInWindow((x, y, _width, height) =>
              setAnchor({ x, y, height }),
            );
          }}
          style={{
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      </View>
      <Modal
        visible={!!anchor}
        transparent
        animationType="none"
        onRequestClose={() => setAnchor(undefined)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close item actions"
          onPress={() => setAnchor(undefined)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#00000022',
          }}
        />
        {anchor && (
          <View
            accessibilityViewIsModal
            style={{
              position: 'absolute',
              left: Math.max(12, Math.min(anchor.x - 150, width - 224)),
              top:
                anchor.y + anchor.height + 248 < height
                  ? anchor.y + anchor.height + 4
                  : Math.max(16, Math.min(anchor.y - 248, height - 264)),
              width: 212,
              padding: 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`${option.label}: ${item.name}`}
                disabled={busy}
                onPress={() => {
                  void select(option.value);
                }}
                style={[
                  s.row,
                  {
                    minHeight: 48,
                    paddingHorizontal: 8,
                    justifyContent: 'flex-start',
                    opacity: busy ? 0.5 : 1,
                  },
                ]}
              >
                <Icon
                  name={option.icon}
                  size={18}
                  color={option.value === 'trash' ? colors.danger : colors.text}
                />
                <Copy
                  style={{
                    fontSize: 13,
                    flex: 1,
                    color:
                      option.value === 'trash' ? colors.danger : colors.text,
                  }}
                >
                  {option.label}
                </Copy>
              </Pressable>
            ))}
            {error && (
              <Copy style={{ color: colors.danger, padding: 8, fontSize: 12 }}>
                {error}
              </Copy>
            )}
          </View>
        )}
      </Modal>
    </>
  );
}
