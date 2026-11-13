import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, HEAT_COLORS } from '../theme';
import type { GameView } from '../types';

const POLICE_LABELS = [
  '🧊 Thanda — chor bohot door',
  '🌤️ Thoda garam — chor ilaake mein',
  '♨️ Garam — chor paas hai',
  '🔥 Bohot garam!',
  '🚨 PAKDO ZONE!',
];
const CHOR_LABELS = [
  '😌 Safe — police door hai',
  '👀 Police ilaake mein',
  '😬 Police paas aa rahi hai',
  '⚠️ Police bohot paas!',
  '🚨 POLICE YAHIN HAI — BHAAGO!',
];

export function HeatMeter({ heat, role }: { heat: GameView['heat']; role: 'chor' | 'police' }) {
  const level = heat ? heat.level : -1;
  const labels = role === 'police' ? POLICE_LABELS : CHOR_LABELS;
  const text = heat ? labels[heat.level] : role === 'police' ? '📡 Koi chor trace nahi ho raha…' : '📡 Police trace nahi ho rahi…';
  const color = heat ? HEAT_COLORS[heat.level] : C.dim;
  return (
    <View>
      <View style={s.bars}>
        {HEAT_COLORS.map((c, i) => (
          <View key={i} style={[s.bar, { backgroundColor: i <= level ? c : C.card2, opacity: i <= level ? 1 : 0.6 }]} />
        ))}
      </View>
      <Text style={[s.text, { color: heat && heat.level >= 2 ? color : C.text }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 10, borderRadius: 5 },
  text: { marginTop: 8, fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
