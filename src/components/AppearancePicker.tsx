import { Pressable, View, useWindowDimensions } from 'react-native';
import { Copy, Icon, Panel } from './ui';
import { SegmentedChoice } from './controls';
import { useMemory, useTheme } from '../hooks/useMemory';
import type { Settings } from '../types/models';
import { colorPalettes } from '../theme/tokens';
import { colorThemes, themeLabels } from '../theme/appearance';

export function AppearancePicker({
  update,
}: {
  update(patch: Partial<Settings>): void;
}) {
  const { data } = useMemory();
  const { colors, dark } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = width < 350 || fontScale > 1.3;
  return (
    <Panel>
      <SegmentedChoice
        value={data.settings.theme}
        options={[
          { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
          { value: 'light', label: 'Light', icon: 'sunny-outline' },
          { value: 'dark', label: 'Dark', icon: 'moon-outline' },
        ]}
        onChange={(theme) => update({ theme: theme as Settings['theme'] })}
      />
      <Copy muted style={{ fontSize: 12 }}>
        Choose a color. Every palette works in light and dark.
      </Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {colorThemes.map((name) => {
          const preview = colorPalettes[name][dark ? 'dark' : 'light'];
          const selected = data.settings.colorTheme === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={`${themeLabels[name]} palette`}
              accessibilityState={{ selected }}
              onPress={() => update({ colorTheme: name })}
              style={({ pressed }) => ({
                width: singleColumn || name === 'essential' ? '100%' : '48%',
                flexGrow: 1,
                minHeight: 68,
                padding: 12,
                borderRadius: 14,
                backgroundColor: preview.background,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              })}
            >
              <View accessible={false} style={{ flexDirection: 'row', gap: 3 }}>
                {[preview.primary, preview.soft, preview.text].map(
                  (color, index) => (
                    <View
                      key={index}
                      style={{
                        width: 13,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: color,
                      }}
                    />
                  ),
                )}
              </View>
              <Copy style={{ color: preview.text, fontWeight: '600', flex: 1 }}>
                {themeLabels[name]}
              </Copy>
              {selected && (
                <Icon
                  name="checkmark-circle"
                  color={preview.primary}
                  size={18}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </Panel>
  );
}
