import React from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
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
  const isChorWin = result.winner === 'chor';
  const color = isChorWin ? C.chor : C.police;
  const me = result.players.find((p) => p.id === myId);
  const won = me && me.role === result.winner;
  const ranked = [...result.players].sort((a, b) => points(b) - points(a));

  const shareSummary = async () => {
    const winnerText = isChorWin ? '😈 CHORS JEET GAYE!' : '👮 POLICE JEET GAYI!';
    const mvpText = result.mvp ? `🏆 MVP: ${result.mvp.name}` : '';
    const msg = `🚨 Chor-Police LIVE Match Result 🚨\n\n${winnerText}\n${result.reason}\n${mvpText}\n\nKhelne ke liye app download karein: https://github.com/Adia12528/ExpoFirstChorPoliceGame`;
    await Share.share({ message: msg });
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      {/* Grand Victory / Defeat Neon Banner */}
      <View style={[s.banner, { borderColor: color, shadowColor: color }]}>
        <Text style={{ fontSize: 64 }}>{isChorWin ? '😈' : '👮‍♂️'}</Text>
        <Text style={[s.title, { color }]}>{isChorWin ? 'CHORS JEET GAYE!' : 'POLICE JEET GAYI!'}</Text>
        <Text style={s.reason}>{result.reason}</Text>

        {me && (
          <View style={[s.statusBadge, { backgroundColor: won ? '#34D39922' : '#EF444422' }]}>
            <Text style={[s.me, { color: won ? C.ok : C.warn }]}>
              {won ? '🎉 Tumhari team jeet gayi!' : '💪 Haar gaye, agli baar zaroor pakdenge!'}
            </Text>
          </View>
        )}

        <View style={s.lootPill}>
          <Text style={{ color: C.loot, fontWeight: '800', fontSize: 14 }}>
            💰 Total Loot: {result.loot} / {result.lootTotal} maal
          </Text>
        </View>
      </View>

      {/* Leaderboard & MVP Card */}
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={s.h}>🏆 Squad Leaderboard</Text>
          <Text style={{ color: C.dim, fontSize: 11 }}>POINTS BASED</Text>
        </View>

        {ranked.map((p, i) => {
          const isMvp = result.mvp && result.mvp.id === p.id;
          return (
            <View key={p.id} style={[s.row, isMvp ? s.mvpRow : null]}>
              <View style={s.rankCol}>
                <Text style={[s.rank, isMvp ? { color: C.loot } : null]}>{isMvp ? '👑' : `#${i + 1}`}</Text>
              </View>

              <View style={{ flex: 1, paddingRight: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.name} numberOfLines={1}>
                    {p.name}
                    {p.id === myId ? ' (tum)' : ''}
                  </Text>
                  {isMvp && (
                    <View style={s.mvpBadge}>
                      <Text style={s.mvpText}>MVP</Text>
                    </View>
                  )}
                </View>
                <Text style={s.stats}>
                  🚨 {p.arrests} arrests · 🔓 {p.frees} freed · 💰 {p.loot} loot
                </Text>
              </View>

              <Chip text={p.role === 'chor' ? 'CHOR' : 'POLICE'} color={p.role === 'chor' ? C.chor : C.police} />
              <Text style={s.pts}>{points(p)} pts</Text>
            </View>
          );
        })}

        <Text style={s.foot}>Rules: Arrest = 3 pts · Chhudana = 3 pts · Maal = 2 pts</Text>
      </Card>

      {/* Quick Action Buttons */}
      <View style={{ gap: 8 }}>
        <Btn title="📤 Share Result to WhatsApp / Friends" color={C.ok} onPress={shareSummary} />
        {isHost ? (
          <Btn title="🔄  Dobara Khelo (Rematch with Role Swap)" color={color} onPress={onRematch} />
        ) : (
          <Card style={{ alignItems: 'center', padding: 12 }}>
            <Text style={{ color: C.text, fontWeight: '700' }}>⏳ Host agla round shuru karega…</Text>
          </Card>
        )}
        <Btn title="Lobby Chhodo" ghost small color={C.dim} onPress={onLeave} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 14, gap: 12, paddingBottom: 40 },
  banner: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 24,
    borderWidth: 2.5,
    backgroundColor: C.card,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  reason: { color: C.text, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  me: { fontSize: 14, fontWeight: '800' },
  lootPill: {
    backgroundColor: '#FBBF241A',
    borderWidth: 1,
    borderColor: '#FBBF2466',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 4,
  },
  h: { color: C.text, fontSize: 16, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    gap: 8,
  },
  mvpRow: {
    backgroundColor: '#FBBF240F',
    borderRadius: 12,
    paddingHorizontal: 8,
    borderTopWidth: 0,
  },
  rankCol: { width: 28, alignItems: 'center' },
  rank: { color: C.dim, fontSize: 15, fontWeight: '800' },
  name: { color: C.text, fontSize: 15, fontWeight: '700' },
  mvpBadge: {
    backgroundColor: C.loot,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mvpText: { color: '#080C18', fontSize: 10, fontWeight: '900' },
  stats: { color: C.dim, fontSize: 11, marginTop: 2 },
  pts: { color: C.loot, fontSize: 14, fontWeight: '900', width: 48, textAlign: 'right' },
  foot: { color: C.dim, fontSize: 11, marginTop: 10, textAlign: 'center' },
});
