import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C } from '../theme';

/** Press-and-hold button: the action fires only after `holdMs` of continuous holding. */
export function HoldButton({
  label,
  sub,
  color,
  enabled,
  holdMs = 2000,
  onComplete,
}: {
  label: string;
  sub: string;
  color: string;
  enabled: boolean;
  holdMs?: number;
  onComplete: () => void | Promise<void>;
}) {
  const prog = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    prog.stopAnimation();
    prog.setValue(0);
    setHolding(false);
  };

  const start = () => {
    if (!enabled || timer.current) return;
    setHolding(true);
    Haptics.selectionAsync().catch(() => {});
    prog.setValue(0);
    Animated.timing(prog, { toValue: 1, duration: holdMs, easing: Easing.linear, useNativeDriver: false }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      prog.setValue(0);
      setHolding(false);
      void onComplete();
    }, holdMs);
  };

  useEffect(() => {
    if (!enabled && timer.current) cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const width = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable onPressIn={start} onPressOut={cancel} disabled={!enabled && !holding}>
      <View style={[s.wrap, { borderColor: enabled ? color : C.line, opacity: enabled ? 1 : 0.55 }]}>
        <Animated.View style={[s.fill, { backgroundColor: color, width }]} />
        <Text style={[s.label, { color: enabled ? '#fff' : C.dim }]}>{holding ? 'Daba ke rakho…' : label}</Text>
        <Text style={s.sub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    height: 84,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: C.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.85 },
  label: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  sub: { color: '#ffffffcc', fontSize: 12, marginTop: 2, fontWeight: '600' },
});
