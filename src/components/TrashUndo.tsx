import { useState } from 'react';
import { View } from 'react-native';
import { useMemory, useTheme } from '../hooks/useMemory';
import type { Item } from '../types/models';
import { Button, Copy, ErrorMessage, IconButton, s } from './ui';
export function TrashUndo({ item, onClose }: { item: Item; onClose(): void }) {
  const { repository } = useMemory();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colors.soft,
        padding: 12,
        borderRadius: 16,
        gap: 8,
      }}
    >
      <View style={s.row}>
        <Copy style={{ flex: 1 }}>{item.name} moved to Trash.</Copy>
        <IconButton
          label="Dismiss Trash notice"
          icon="close"
          onPress={onClose}
        />
      </View>
      <Button
        secondary
        title="Undo"
        busy={busy}
        onPress={() => {
          setBusy(true);
          void repository
            .restoreItem(item.id)
            .then(onClose)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      />
      <ErrorMessage message={error} />
    </View>
  );
}
