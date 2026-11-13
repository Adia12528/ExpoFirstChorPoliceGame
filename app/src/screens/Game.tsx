import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { HeatMeter } from '../components/HeatMeter';
import { HoldButton } from '../components/HoldButton';
import { Radar } from '../components/Radar';
import { Btn, Card } from '../components/UI';
import { ARREST_RANGE, FREE_RANGE, LOOT_RANGE, WEAK_GPS } from '../constants';
import { compass } from '../geo';
import { buzz } from '../haptics';
import { emitAck } from '../net';
import { playSfx, setProximityHeat, stopMusic } from '../sound';
import { useCompass } from '../useCompass';
import { C, HEAT_COLORS, teamColor } from '../theme';
import type { Ack, FeedItem, GameView } from '../types';

const RANGES = [30, 60, 120, 250];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const nearest = (xs: { dx: number; dy: number }[]) =>
  xs.reduce<{ d: number; dx: number; dy: number } | null>((best, x) => {
    const d = Math.hypot(x.dx, x.dy);
    return !best || d < best.d ? { d, dx: x.dx, dy: x.dy } : best;
  }, null);

function PadBtn({ label, onStep }: { label: string; onStep: () => void }) {
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (t.current) {
      clearInterval(t.current);
      t.current = null;
    }
  };
  useEffect(() => stop, []);
  return (
    <Pressable
      onPressIn={() => {
        onStep();
        stop();
        t.current = setInterval(onStep, 200);
      }}
      onPressOut={stop}
      style={s.pad}
    >
      <Text style={s.padText}>{label}</Text>
    </Pressable>
  );
}

export function Game({
  view,
  feed,
  fake,
  fakeMove,
  compassEnabled = true,
  onToggleCompass,
  onLeave,
}: {
  view: GameView;
  feed: FeedItem[];
  fake: boolean;
  fakeMove: (dx: number, dy: number) => void;
  compassEnabled?: boolean;
  onToggleCompass?: () => void;
  onLeave: () => void;
}) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const role = (view.role ?? 'police') as 'chor' | 'police';
  const color = teamColor(role);
  const isPolice = role === 'police';
  const radarSize = Math.min(width - 24, height * 0.38);
  const [range, setRange] = useState(60);
  const [step, setStep] = useState(2);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heading = useCompass(compassEnabled && !fake);
  const playing = view.phase === 'playing';
  const level = view.heat?.level ?? 0;

  // heartbeat haptics, tension audio and proximity sonar
  useEffect(() => {
    if (!playing || view.status === 'jailed') {
      setProximityHeat(0);
      return;
    }
    setProximityHeat(level);
    if (level === 4) {
      buzz('radarPing');
      playSfx('radar');
    } else if (level === 3) {
      buzz('medium');
    }
    return () => setProximityHeat(0);
  }, [view, playing, level]);

  // Audio triggers on CCTV and loot
  const prevLoot = useRef(view.score.loot);
  const prevCctv = useRef(view.cctv.state);
  useEffect(() => {
    if (view.score.loot > prevLoot.current) {
      playSfx('loot');
    }
    prevLoot.current = view.score.loot;
  }, [view.score.loot]);

  useEffect(() => {
    if (view.cctv.state === 'warning' && prevCctv.current !== 'warning') {
      playSfx('cctv');
    } else if (view.cctv.state === 'live' && prevCctv.current !== 'live') {
      playSfx('siren');
    }
    prevCctv.current = view.cctv.state;
  }, [view.cctv.state]);

  useEffect(
    () => () => {
      if (msgTimer.current) clearTimeout(msgTimer.current);
    },
    [],
  );

  const act = async (ev: 'arrest' | 'free') => {
    const r = await emitAck<Ack>(ev);
    if (r.ok) {
      buzz(ev === 'arrest' ? 'arrest' : 'escape');
      playSfx(ev === 'arrest' ? 'arrest' : 'freed');
    } else {
      buzz('error');
    }
    setActionMsg({ text: r.msg ?? (r.ok ? 'Ho gaya!' : 'Nahi hua'), ok: r.ok });
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setActionMsg(null), 3500);
  };

  const useAbility = async () => {
    const r = await emitAck<Ack>('ability:use');
    if (r.ok) {
      buzz(isPolice ? 'heavy' : 'escape');
      playSfx(isPolice ? 'boost' : 'smoke');
    } else {
      buzz('error');
    }
    setActionMsg({ text: r.msg ?? (r.ok ? 'Ability chalu!' : 'Nahi chali'), ok: r.ok });
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setActionMsg(null), 3500);
  };

  const nearFoe = nearest(view.foes.filter((f) => f.kind === 'sense'));
  const nearJail = nearest(view.jails.filter((j) => j.id && Math.hypot(j.dx, j.dy) > 0.5));
  const nearLoot = nearest(view.loot);

  const banners: { text: string; color: string }[] = [];
  if (!view.me.signal) banners.push({ text: '📡 GPS signal nahi aa raha — khule mein jao', color: C.danger });
  else if ((view.me.acc ?? 0) > WEAK_GPS) banners.push({ text: `📡 GPS weak (±${view.me.acc}m) — pakadna/maal uthana kaam nahi karega`, color: C.warn });
  if (view.me.outside) banners.push({ text: '⚠️ Tum zone se bahar ho! Wapas aao', color: C.warn });
  if (view.immuneLeft > 0) banners.push({ text: `🛡️ Immune: ${view.immuneLeft}s — bhaag lo!`, color: C.ok });
  if (view.phase === 'headstart' && !isPolice) banners.push({ text: `🙈 Chhup jao! Police ${view.timeLeft}s mein khulegi`, color: C.chor });

  const cctv = view.cctv;
  const ability = view.ability;
  const confirmLeave = () =>
    Alert.alert('Room chhodna hai?', 'Game beech mein chhodoge to tumhari team ko nuksaan hoga.', [
      { text: 'Ruko', style: 'cancel' },
      { text: 'Chhodo', style: 'destructive', onPress: onLeave },
    ]);

  return (
    <View style={[s.root, level >= 3 && playing && view.status === 'free' && { borderColor: HEAT_COLORS[level], borderWidth: 3 }]}>
      <ScrollView contentContainerStyle={[s.scroll, fake && { paddingBottom: 90 }]} bounces={false}>
        {/* header */}
        <View style={s.header}>
          <View style={[s.badge, { backgroundColor: color }]}>
            <Text style={s.badgeText}>{isPolice ? '👮 POLICE' : '😈 CHOR'}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.timeLabel}>{view.phase === 'headstart' ? 'CHHUPNE KA TIME' : 'TIME BACHA'}</Text>
            <Text style={s.time}>{mmss(view.timeLeft)}</Text>
          </View>
          <Pressable onPress={confirmLeave} hitSlop={10} style={s.leave}>
            <Text style={{ color: C.dim, fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>

        <Text style={s.score}>
          {isPolice
            ? `🔓 Azaad chor: ${view.score.chorsFree}/${view.score.chorsTotal}   ·   💰 Loot hua: ${view.score.loot}/${view.score.lootTotal}`
            : `💰 Maal: ${view.score.loot}/${view.score.lootTotal}   ·   😈 Azaad chor: ${view.score.chorsFree}/${view.score.chorsTotal}`}
        </Text>

        {/* event feed */}
        {feed.map((f) => (
          <View key={f.id} style={[s.feed, { borderLeftColor: f.type === 'bad' || f.type === 'warn' ? C.danger : f.type === 'cctv' ? C.warn : f.type === 'good' || f.type === 'start' ? C.ok : C.line }]}>
            <Text style={s.feedText}>{f.text}</Text>
          </View>
        ))}
        {banners.map((b, i) => (
          <View key={i} style={[s.banner, { borderColor: b.color }]}>
            <Text style={{ color: b.color, fontWeight: '800', fontSize: 13 }}>{b.text}</Text>
          </View>
        ))}

        {/* radar */}
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View>
            <Radar
              size={radarSize}
              range={range}
              view={view}
              role={role}
              actionRange={isPolice ? ARREST_RANGE : Math.max(FREE_RANGE, LOOT_RANGE)}
              heading={compassEnabled && !fake ? heading : 0}
            />
            {view.blind && (
              <View style={[s.blind, { borderRadius: radarSize / 2 }]}>
                <Text style={{ fontSize: 40 }}>🙈</Text>
                <Text style={s.blindText}>Aankhein band!{'\n'}Chor chhup rahe hain… {view.timeLeft}s</Text>
              </View>
            )}
          </View>
          <View style={s.zoom}>
            <Pressable onPress={() => setRange(RANGES[Math.max(0, RANGES.indexOf(range) - 1)])} style={s.zoomBtn}>
              <Text style={s.zoomText}>＋</Text>
            </Pressable>
            <Text style={s.zoomLabel}>Radar: {range}m</Text>
            <Pressable onPress={() => setRange(RANGES[Math.min(RANGES.length - 1, RANGES.indexOf(range) + 1)])} style={s.zoomBtn}>
              <Text style={s.zoomText}>－</Text>
            </Pressable>
            {onToggleCompass && (
              <Pressable onPress={onToggleCompass} style={[s.zoomBtn, { width: 44, marginLeft: 6 }]}>
                <Text style={{ fontSize: 15 }}>{compassEnabled ? '🧭' : '⬆️'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* heat + cctv */}
        {playing && view.status === 'free' && (
          <View style={{ marginTop: 6, gap: 10 }}>
            <HeatMeter heat={view.heat} role={role} />
            <View
              style={[
                s.cctv,
                {
                  borderColor: cctv.state === 'live' ? C.danger : cctv.state === 'warning' ? C.warn : C.line,
                  backgroundColor: cctv.state === 'live' ? '#FF3B4A22' : cctv.state === 'warning' ? '#FFB02022' : C.card,
                },
              ]}
            >
              <Text style={{ color: cctv.state === 'idle' ? C.dim : C.text, fontWeight: '800', fontSize: 13 }}>
                {cctv.state === 'live'
                  ? isPolice
                    ? `📹 CCTV ON — chor dikh rahe hain (${cctv.inSec}s)`
                    : `📹 CCTV ON — tum dikh rahe ho! (${cctv.inSec}s)`
                  : cctv.state === 'warning'
                    ? `📹 CCTV ${cctv.inSec}s mein ON!`
                    : `📹 Agla CCTV: ${cctv.inSec}s`}
              </Text>
            </View>

            {/* Tactical Special Ability */}
            {ability && (
              <Card style={{ borderColor: ability.active ? C.ok : ability.ready ? color : C.line, padding: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>
                      {isPolice ? '📡 Radar Boost' : '💨 Dhuaan (Smoke Bomb)'}
                    </Text>
                    <Text style={s.hint}>
                      {ability.active
                        ? `ACTIVE: ${ability.activeLeft}s bache hain!`
                        : isPolice
                          ? '8s ke liye radar sensing range 35m ho jayegi'
                          : '8s ke liye radar & CCTV se gayab ho jao'}
                    </Text>
                  </View>
                  <Btn
                    small
                    title={
                      ability.active
                        ? '🔥 Active'
                        : ability.ready
                          ? '⚡ USE'
                          : `${ability.cooldownLeft}s`
                    }
                    color={ability.active ? C.ok : color}
                    disabled={!ability.ready || ability.active}
                    onPress={useAbility}
                  />
                </View>
              </Card>
            )}
          </View>
        )}

        {/* action area */}
        <View style={{ marginTop: 14 }}>
          {view.status === 'jailed' ? (
            <Card style={{ borderColor: C.chor, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 34 }}>🔒</Text>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>Tum jail mein ho!</Text>
              <Text style={s.dimCenter}>Radar pe dekho — koi azaad chor dost aake CHHUDAO karega. Tab tak wahin ruko.</Text>
            </Card>
          ) : view.blind ? null : isPolice ? (
            <HoldButton
              label="🚔  PAKDO"
              sub={nearFoe && nearFoe.d <= ARREST_RANGE + 3 ? 'Chor paas hai! 2 second daba ke rakho' : 'Chor ke 12m ke andar aao'}
              color={C.police}
              enabled={playing && !!nearFoe && nearFoe.d <= ARREST_RANGE + 3}
              onComplete={() => act('arrest')}
            />
          ) : view.jails.length > 0 ? (
            <View style={{ gap: 8 }}>
              <HoldButton
                label="🔓  CHHUDAO"
                sub={nearJail && nearJail.d <= FREE_RANGE + 3 ? 'Jail paas hai! 2 second daba ke rakho' : 'Jail ke 12m ke andar aao'}
                color={C.chor}
                enabled={playing && !!nearJail && nearJail.d <= FREE_RANGE + 3}
                onComplete={() => act('free')}
              />
              {nearJail && nearJail.d > FREE_RANGE + 3 && (
                <Text style={s.dimCenter}>
                  Dost jail mein hai: {compass(nearJail.dx, nearJail.dy).arrow} {Math.round(nearJail.d)}m
                </Text>
              )}
            </View>
          ) : (
            <Card style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>💰 Maal ke 10m paas jao — apne aap uth jaata hai</Text>
              {nearLoot ? (
                <Text style={s.dimCenter}>
                  Sabse paas maal: {compass(nearLoot.dx, nearLoot.dy).arrow} {compass(nearLoot.dx, nearLoot.dy).name} · {Math.round(nearLoot.d)}m
                </Text>
              ) : null}
            </Card>
          )}
          {actionMsg && (
            <Text style={[s.actionMsg, { color: actionMsg.ok ? C.ok : C.danger }]}>{actionMsg.text}</Text>
          )}
        </View>

      </ScrollView>

      {/* fake GPS pad — pinned to the bottom so the radar stays visible while you walk */}
      {fake && (
        <View style={s.dpad}>
          <PadBtn label="←" onStep={() => fakeMove(-step, 0)} />
          <PadBtn label="↓" onStep={() => fakeMove(0, -step)} />
          <PadBtn label="↑" onStep={() => fakeMove(0, step)} />
          <PadBtn label="→" onStep={() => fakeMove(step, 0)} />
          <Pressable onPress={() => setStep(step === 2 ? 8 : 2)} style={[s.pad, { backgroundColor: C.card2, width: 58 }]}>
            <Text style={s.padText}>{step}m</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, borderColor: 'transparent', borderWidth: 3 },
  scroll: { padding: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  badgeText: { color: '#fff', fontWeight: '900', letterSpacing: 1, fontSize: 14 },
  timeLabel: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  time: { color: C.text, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] },
  leave: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  score: { color: C.dim, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4, marginBottom: 6 },
  feed: { backgroundColor: C.card, borderLeftWidth: 4, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, marginTop: 5 },
  feedText: { color: C.text, fontSize: 13, fontWeight: '600' },
  banner: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, marginTop: 6, backgroundColor: C.card },
  blind: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#0A0E1AEE', alignItems: 'center', justifyContent: 'center' },
  blindText: { color: C.text, fontWeight: '800', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  zoom: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  zoomBtn: { width: 38, height: 34, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  zoomText: { color: C.text, fontSize: 16, fontWeight: '800' },
  zoomLabel: { color: C.dim, fontWeight: '700', fontSize: 13, minWidth: 90, textAlign: 'center' },
  cctv: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  dimCenter: { color: C.dim, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  hint: { color: C.dim, fontSize: 12, marginTop: 2 },
  actionMsg: { textAlign: 'center', fontWeight: '800', fontSize: 15, marginTop: 10 },
  dpad: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8, backgroundColor: '#0A0E1AF2', borderTopWidth: 1, borderTopColor: C.line },
  pad: { width: 54, height: 48, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  padText: { color: C.text, fontSize: 21, fontWeight: '800' },
});
