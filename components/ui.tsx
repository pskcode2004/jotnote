import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradient, radius, shadow } from '../lib/theme';

type TextOwn = { w?: keyof typeof fonts; size?: number; color?: string };

export function T({ w = 'r', size = 15, color = colors.text, style, ...rest }: TextProps & TextOwn) {
  return <Text {...rest} style={[{ fontFamily: fonts[w], fontSize: size, color }, style]} />;
}

export function Input(props: TextInputProps & { boxStyle?: StyleProp<ViewStyle> }) {
  const { boxStyle, style, ...rest } = props;
  return (
    <View style={[s.inputBox, boxStyle]}>
      <TextInput
        placeholderTextColor={colors.sub}
        {...rest}
        style={[{ fontFamily: fonts.r, fontSize: 15, color: colors.text, padding: 0 }, style]}
      />
    </View>
  );
}

type BtnProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'soft' | 'danger' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
};

export function Button({ label, onPress, kind = 'primary', disabled, style, icon }: BtnProps) {
  const palette: Record<string, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.navy, fg: '#fff' },
    soft: { bg: colors.chip, fg: colors.navy },
    danger: { bg: '#fff', fg: colors.danger, border: colors.danger },
    outline: { bg: '#fff', fg: colors.navy, border: colors.line },
  };
  const p = palette[kind];
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        s.btn,
        { backgroundColor: p.bg, borderColor: p.border ?? p.bg, opacity: disabled ? 0.5 : 1 },
        kind === 'primary' && shadow,
        style,
      ]}>
      {icon}
      <T w="m" size={15} color={p.fg}>
        {label}
      </T>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, shadow, style]}>{children}</View>;
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        active && { backgroundColor: colors.navy },
        color ? { borderColor: color, borderWidth: 1.5 } : null,
      ]}>
      <T w="m" size={13} color={active ? '#fff' : colors.navy}>
        {label}
      </T>
    </Pressable>
  );
}

/** Gradient orb with the little "^ ^" eyes used as the app mascot. */
export function Orb({ size = 120 }: { size?: number }) {
  const e = size * 0.085;
  const eye: ViewStyle = {
    position: 'absolute',
    top: size * 0.36,
    width: 0,
    height: 0,
    borderLeftWidth: e,
    borderRightWidth: e,
    borderBottomWidth: e * 1.8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
  };
  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient
        colors={[colors.navy, colors.orchid, colors.peach]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1, borderRadius: size / 2 }}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: size / 2 }}
      />
      <View style={[eye, { left: size * 0.3 }]} />
      <View style={[eye, { right: size * 0.3 }]} />
    </View>
  );
}

export function GradientFab({ onPress, label = '+' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.fab, shadow]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabIn}>
        <T w="sb" size={28} color="#fff" style={{ lineHeight: 32 }}>
          {label}
        </T>
      </LinearGradient>
    </Pressable>
  );
}

export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? colors.orchid,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <T w="sb" size={size * 0.42} color="#fff">
        {(name || '?').charAt(0).toUpperCase()}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  inputBox: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  btn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginRight: 8,
    borderColor: 'transparent',
    borderWidth: 1.5,
  },
  fab: { position: 'absolute', right: 20, bottom: 100, borderRadius: 30 },
  fabIn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
