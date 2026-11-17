import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useMemory';
import { Copy, Icon, IconButton, s, type IconName } from './ui';

export function SearchBox({
  value,
  onChangeText,
  placeholder = 'Search your memories…',
  autoFocus = false,
  label = 'Search items and places',
}: {
  value: string;
  onChangeText(value: string): void;
  placeholder?: string;
  autoFocus?: boolean;
  label?: string;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        s.row,
        {
          gap: 10,
          minHeight: 56,
          paddingLeft: 16,
          paddingRight: 4,
          borderRadius: 17,
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: focused ? colors.primary : colors.border,
        },
      ]}
    >
      <Icon
        name="search-outline"
        size={21}
        color={focused ? colors.primary : colors.secondary}
      />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          minWidth: 0,
          paddingVertical: 15,
          color: colors.text,
          fontSize: 16,
          outlineWidth: 0,
          outlineStyle: 'solid',
          outlineColor: 'transparent',
        }}
      />
      {value ? (
        <IconButton
          icon="close"
          label="Clear search"
          onPress={() => onChangeText('')}
        />
      ) : (
        <View style={{ width: 10 }} />
      )}
    </View>
  );
}

export function SelectionRow({
  title,
  subtitle,
  icon,
  onPress,
  danger,
  disabled,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress(): void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        {
          minHeight: 64,
          paddingVertical: 12,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          backgroundColor: colors.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={icon}
          size={20}
          color={danger ? colors.danger : colors.primary}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Copy
          style={{
            fontWeight: '600',
            color: danger ? colors.danger : colors.text,
          }}
        >
          {title}
        </Copy>
        {subtitle && (
          <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
            {subtitle}
          </Copy>
        )}
      </View>
      <Icon name="chevron-forward" size={16} color={colors.secondary} />
    </Pressable>
  );
}

export interface Choice {
  value: string;
  label: string;
  detail?: string;
  icon?: IconName;
}
export function ChoiceSheet({
  visible,
  title,
  options,
  selected,
  searchable,
  onSelect,
  onClose,
  closeOnSelect = true,
}: {
  visible: boolean;
  title: string;
  options: Choice[];
  selected?: string;
  searchable?: boolean;
  onSelect(value: string): void;
  onClose(): void;
  closeOnSelect?: boolean;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const matches = options.filter((option) =>
    `${option.label} ${option.detail ?? ''}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setQuery('')}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: '#0E201C66',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          onPress={onClose}
          style={{ position: 'absolute', inset: 0 }}
        />
        <SafeAreaView
          edges={['bottom']}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '85%',
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
          }}
        >
          <View style={{ padding: 20, gap: 16, flexShrink: 1 }}>
            <View style={s.row}>
              <Copy title style={{ flex: 1 }}>
                {title}
              </Copy>
              <IconButton
                icon="close"
                label={`Close ${title}`}
                onPress={onClose}
              />
            </View>
            {searchable && (
              <SearchBox
                label="Search choices"
                value={query}
                onChangeText={setQuery}
                placeholder="Search choices…"
              />
            )}
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={matches}
              keyExtractor={(option) => option.value}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              ListEmptyComponent={
                <Copy muted>No matching choices here yet.</Copy>
              }
              renderItem={({ item: option }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: selected === option.value }}
                  onPress={() => {
                    onSelect(option.value);
                    if (closeOnSelect) onClose();
                  }}
                  style={({ pressed }) => [
                    s.row,
                    {
                      gap: 14,
                      padding: 14,
                      marginBottom: 4,
                      minHeight: 58,
                      borderRadius: 15,
                      backgroundColor:
                        selected === option.value
                          ? colors.soft
                          : pressed
                            ? colors.subtle
                            : colors.surface,
                    },
                  ]}
                >
                  {option.icon && <Icon name={option.icon} size={21} />}
                  <View style={{ flex: 1 }}>
                    <Copy
                      style={{
                        fontWeight: selected === option.value ? '700' : '500',
                      }}
                    >
                      {option.label}
                    </Copy>
                    {option.detail && (
                      <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                        {option.detail}
                      </Copy>
                    )}
                  </View>
                  {selected === option.value && (
                    <Icon name="checkmark-circle" size={22} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SegmentedChoice({
  options,
  value,
  onChange,
}: {
  options: Choice[];
  value: string;
  onChange(value: string): void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 5,
        borderRadius: 17,
        backgroundColor: colors.subtle,
      }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 52,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            paddingHorizontal: 4,
            backgroundColor:
              value === option.value ? colors.surface : 'transparent',
            borderWidth: 1,
            borderColor: value === option.value ? colors.border : 'transparent',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {option.icon && (
            <Icon
              name={option.icon}
              size={20}
              color={value === option.value ? colors.primary : colors.secondary}
            />
          )}
          <Copy
            style={{
              fontSize: 13,
              fontWeight: value === option.value ? '700' : '500',
              color: value === option.value ? colors.text : colors.secondary,
            }}
          >
            {option.label}
          </Copy>
        </Pressable>
      ))}
    </View>
  );
}
