import { useState, type ReactNode, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useTheme } from '../hooks/useMemory';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? colors.primary}
      accessible={false}
    />
  );
}
export function Copy({
  children,
  muted,
  title,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  title?: boolean;
  style?: ComponentProps<typeof Text>['style'];
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        {
          color: muted ? colors.secondary : colors.text,
          fontSize: title ? 23 : 15,
          lineHeight: title ? 30 : 23,
          fontWeight: title ? '700' : '400',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  icon,
  secondary,
  disabled,
  busy,
  danger,
}: {
  title: string;
  onPress(): void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const foreground = danger
    ? colors.danger
    : secondary
      ? colors.primary
      : colors.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            secondary || danger
              ? colors.soft
              : pressed
                ? colors.pressed
                : colors.primary,
          opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : icon ? (
        <Icon name={icon} color={foreground} size={20} />
      ) : null}
      <Text
        style={{
          color: foreground,
          fontSize: 16,
          fontWeight: '700',
          flexShrink: 1,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress(): void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: colors.soft,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} />
    </Pressable>
  );
}
export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
export function Header({
  title,
  home,
  right,
}: {
  title: string;
  home?: boolean;
  right?: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const { colors } = useTheme();
  const destinations: [string, Href, IconName][] = [
    ['Home', '/', 'home-outline'],
    ['All Items', '/items', 'grid-outline'],
    ['My Places', '/places', 'file-tray-outline'],
    ['Favorites', '/favorites', 'heart-outline'],
    ['Archived Items', '/archived', 'archive-outline'],
    ['Settings', '/settings', 'settings-outline'],
    ['About', '/about', 'information-circle-outline'],
  ];
  return (
    <>
      <View style={[s.row, { marginBottom: 12 }]}>
        {home ? (
          <View style={[s.row, { justifyContent: 'flex-start', flex: 1 }]}>
            <View
              style={{
                padding: 13,
                borderRadius: 17,
                backgroundColor: colors.primary,
              }}
            >
              <Icon name="cube-outline" color={colors.onPrimary} size={25} />
            </View>
            <View>
              <Copy
                style={{ fontSize: 21, fontWeight: '800', letterSpacing: -0.7 }}
              >
                Item-Nesia
              </Copy>
              <Copy muted style={{ fontSize: 12 }}>
                Your backup memory.
              </Copy>
            </View>
          </View>
        ) : (
          <>
            <IconButton
              icon="arrow-back"
              label="Go back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/')
              }
            />
            <Copy title style={{ flex: 1, fontSize: 20 }}>
              {title}
            </Copy>
          </>
        )}
        {right ??
          (home ? (
            <IconButton
              icon="menu-outline"
              label="Open menu"
              onPress={() => setMenu(true)}
            />
          ) : null)}
      </View>
      <Modal
        visible={menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(false)}
      >
        <Pressable
          accessibilityLabel="Dismiss menu"
          onPress={() => setMenu(false)}
          style={{
            flex: 1,
            backgroundColor: '#00000055',
            padding: 24,
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 22,
              padding: 12,
              marginTop: 50,
              width: 250,
            }}
          >
            {destinations.map(([label, href, icon]) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => {
                  setMenu(false);
                  router.navigate(href);
                }}
                style={[s.row, { padding: 13, justifyContent: 'flex-start' }]}
              >
                <Icon name={icon} />
                <Copy>{label}</Copy>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Copy style={{ fontWeight: '600' }}>{label}</Copy>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.secondary}
        {...props}
        style={[
          s.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Panel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?(): void;
}) {
  return (
    <View style={s.row}>
      <Copy title style={{ fontSize: 19, flex: 1 }}>
        {title}
      </Copy>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ paddingVertical: 12, paddingLeft: 10 }}
        >
          <Copy style={{ fontWeight: '600', fontSize: 13 }}>{action} →</Copy>
        </Pressable>
      )}
    </View>
  );
}
export function Empty({
  title,
  message,
  action,
  onPress,
}: {
  title: string;
  message: string;
  action?: string;
  onPress?(): void;
}) {
  return (
    <Panel>
      <Icon name="cube-outline" size={36} />
      <Copy title>{title}</Copy>
      <Copy muted>{message}</Copy>
      {action && onPress && <Button title={action} onPress={onPress} />}
    </Panel>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  const { colors } = useTheme();
  return message ? (
    <Text
      accessibilityRole="alert"
      style={{ color: colors.danger, lineHeight: 22 }}
    >
      {message}
    </Text>
  ) : null;
}
export async function confirm(
  title: string,
  message: string,
): Promise<boolean> {
  if (Platform.OS === 'web') return window.confirm(`${title}\n\n${message}`);
  const { Alert } = await import('react-native');
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
export const s = StyleSheet.create({
  content: {
    padding: 24,
    gap: 20,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 54,
    fontSize: 16,
  },
});
