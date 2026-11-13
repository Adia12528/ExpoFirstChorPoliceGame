import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { C } from '../theme';

export function Btn({
  title,
  onPress,
  color = C.police,
  disabled,
  ghost,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  ghost?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        ghost ? { borderColor: color, borderWidth: 1.5, backgroundColor: 'transparent' } : { backgroundColor: color },
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.85 },
        style,
      ]}
    >
      <Text style={[s.btnText, ghost && { color }, small && { fontSize: 14 }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Chip({ text, color = C.dim, bg }: { text: string; color?: string; bg?: string }) {
  return (
    <View style={[s.chip, { borderColor: color, backgroundColor: bg ?? 'transparent' }]}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  editable,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  editable: boolean;
}) {
  return (
    <View style={s.stepRow}>
      <Text style={s.stepLabel}>{label}</Text>
      <View style={s.stepCtl}>
        {editable && (
          <Pressable onPress={onMinus} style={s.stepBtn} hitSlop={8}>
            <Text style={s.stepBtnText}>−</Text>
          </Pressable>
        )}
        <Text style={s.stepValue}>{value}</Text>
        {editable && (
          <Pressable onPress={onPlus} style={s.stepBtn} hitSlop={8}>
            <Text style={s.stepBtnText}>+</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  btn: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  stepLabel: { color: C.text, fontSize: 15, flex: 1 },
  stepCtl: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: C.text, fontSize: 20, fontWeight: '700', marginTop: -2 },
  stepValue: { color: C.text, fontSize: 16, fontWeight: '800', minWidth: 88, textAlign: 'center' },
});
