import { useMotion } from '../hooks/useMotion';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  commonIcons,
  iconNames,
  iconLabel,
  iconSection,
  iconSections,
  validIcon,
} from '../utils/icons';
import { useTheme } from '../hooks/useMemory';
import { SearchBox, SelectionRow } from './controls';
import { Button, Copy, Icon, IconButton, Screen, s, type IconName } from './ui';
type Row = { id: string; title?: string; icons?: string[] };
export function IconPicker({
  value,
  onChange,
  suggestion = 'cube-outline',
}: {
  value?: string;
  onChange(value: string): void;
  suggestion?: string;
}) {
  const motion = useMotion();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('All');
  const { width, fontScale } = useWindowDimensions();
  const { colors } = useTheme();
  const columns = Math.max(
    2,
    Math.min(
      6,
      Math.floor((Math.min(width, 640) - 40) / (fontScale > 1.3 ? 100 : 76)),
    ),
  );
  const rows = useMemo(() => {
    const output: Row[] = [];
    const matches = (name: string) =>
      iconLabel(name).includes(search.trim().toLowerCase().replace(/-/g, ' '));
    const groups =
      section === 'All'
        ? [
            'Common choices',
            ...iconSections.map(([title]) => title),
            'More icons',
          ]
        : [section];
    for (const title of groups) {
      const names = (
        title === 'Common choices'
          ? [...new Set([suggestion, ...commonIcons])].filter((name) =>
              iconNames.includes(name),
            )
          : iconNames.filter((name) => iconSection(name) === title)
      ).filter(matches);
      if (!names.length) continue;
      output.push({ id: title, title });
      for (let index = 0; index < names.length; index += columns)
        output.push({
          id: `${title}:${index}`,
          icons: names.slice(index, index + columns),
        });
    }
    return output;
  }, [section, search, columns, suggestion]);
  return (
    <>
      <SelectionRow
        title="Icon"
        subtitle={value ? iconLabel(value) : 'Automatic · tap to choose'}
        icon={validIcon(value, suggestion) as IconName}
        onPress={() => {
          setSearch('');
          setSection('All');
          setOpen(true);
        }}
      />
      <Modal
        visible={open}
        animationType={motion ? 'slide' : 'none'}
        onRequestClose={() => setOpen(false)}
      >
        <Screen scroll={false}>
          <View style={s.row}>
            <Copy title style={{ flex: 1 }}>
              Choose an icon
            </Copy>
            <IconButton
              icon="close"
              label="Close icon picker"
              onPress={() => setOpen(false)}
            />
          </View>
          <SearchBox
            value={search}
            onChangeText={setSearch}
            label="Search icons"
            placeholder="Search icons, e.g. bed or camera"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {[
              'All',
              'Common choices',
              ...iconSections.map(([title]) => title),
              'More icons',
            ].map((title) => (
              <Pressable
                key={title}
                accessibilityRole="button"
                accessibilityState={{ selected: section === title }}
                onPress={() => setSection(title)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor:
                    section === title ? colors.soft : colors.surface,
                }}
              >
                <Copy>{title}</Copy>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            secondary
            title="Use automatic icon"
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
          />
          <FlatList
            data={rows}
            keyExtractor={(row) => row.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Copy muted>No icons match. Try a shorter word.</Copy>
            }
            renderItem={({ item }) =>
              item.title ? (
                <Copy style={{ fontWeight: '700', marginVertical: 12 }}>
                  {item.title}
                </Copy>
              ) : (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {item.icons?.map((name) => (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={iconLabel(name)}
                      accessibilityState={{ selected: value === name }}
                      onPress={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      style={{
                        width: `${(100 - columns * 2) / columns}%`,
                        minHeight: 88,
                        padding: 6,
                        alignItems: 'center',
                        gap: 5,
                        borderRadius: 12,
                        backgroundColor:
                          value === name ? colors.soft : colors.surface,
                      }}
                    >
                      <Icon name={name as IconName} size={26} />
                      <Copy
                        numberOfLines={2}
                        style={{
                          fontSize: 9,
                          lineHeight: 13,
                          textAlign: 'center',
                        }}
                      >
                        {iconLabel(name)}
                      </Copy>
                    </Pressable>
                  ))}
                </View>
              )
            }
          />
        </Screen>
      </Modal>
    </>
  );
}
