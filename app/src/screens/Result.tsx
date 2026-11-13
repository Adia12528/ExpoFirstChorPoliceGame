import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Chip } from '../components/UI';
import { C } from '../theme';
import type { GameResult } from '../types';

const points = (p: { arrests: number; frees: number; loot: number }) => p.arrests * 3 + p.frees * 3 + p.loot * 2;

export function Result({
  result,
  myId,
  isHost,
  onRematch,
  onLeave,
}: {
  result: GameResult;
  myId: string;
  isHost: boolean;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const color = result.winner === 'chor' ? C.chor : C.police;
  const me = result.players.find((p) => p.id === myId);
  const won = me && me.role === result.winner;
  const ranked = [...result.players].sort((a, b) => points(b) - points(a));

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={[s.banner, { borderColor: color }]}>
        <Text style={{ fontSize: 54 }}>{result.winner === 'chor' ? '😈' : '👮'}</Text>
        <Text style={[s.title, { color }]}>{result.winner === 'chor' ? 'CHOR JEET GAYE!' : 'POLICE JEET GAYI!'}</Text>
        <Text style={s.reason}>{result.reason}</Text>
        {me && <Text style={[s.me, { color: won ? C.ok : C.dim }]}>{won ? '🎉 Tumhari team jeet gayi!' : 'Agli baar zaroor 💪'}</Text>}
        <Text style={s.reason}>
          💰 Maal: {result.loot}/{result.lootTotal}
        </Text>
      </View>

      <Card>
        <Text style={s.h}>Scoreboard</Text>
        {ranked.map((p, i) => (
          <View key={p.id} style={s.row}>
            <Text style={s.rank}>{result.mvp && result.mvp.id === p.id ? '🏆' : `${i + 1}.`}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>
                {p.name}
                {p.id === myId ? ' (tum)' : ''}
              </Text>
              <Text style={s.stats}>
                🚔 {p.arrests} pakde · 🔓 {p.frees} chhudaye · 💰 {p.loot} maal
              </Text>
            </View>
            <Chip text={p.role === 'chor' ? 'CHOR' : 'POLICE'} color={p.role === 'chor' ? C.chor : C.police} />
            <Text style={s.pts}>{points(p)}</Text>
          </View>
        ))}
        <Text style={s.foot}>Points: pakadna 3 · chhudana 3 · maal 2</Text>
      </Card>

      {isHost ? (
        <Btn title="🔁  Dobara khelo (lobby)" color={C.chor} onPress={onRematch} />
      ) : (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>⏳ Host rematch shuru karega…</Text>
        </Card>
      )}
      <Btn title="Room chhodo" ghost small color={C.dim} onPress={onLeave} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 14, gap: 12, paddingBottom: 40 },
  banner: { alignItems: 'center', gap: 6, padding: 22, borderRadius: 20, borderWidth: 2, backgroundColor: C.card },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  reason: { color: C.text, fontSize: 15, textAlign: 'center' },
  me: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  h: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line },
  rank: { color: C.dim, fontSize: 16, width: 28, fontWeight: '800' },
  name: { color: C.text, fontSize: 16, fontWeight: '700' },
  stats: { color: C.dim, fontSize: 12, marginTop: 2 },
  pts: { color: C.loot, fontSize: 18, fontWeight: '900', width: 34, textAlign: 'right' },
  foot: { color: C.dim, fontSize: 11, marginTop: 10, textAlign: 'center' },
});
