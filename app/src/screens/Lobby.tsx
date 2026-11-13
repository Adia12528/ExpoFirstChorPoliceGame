import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useKeepAwake } from 'expo-keep-awake';
import { Btn, Card, Chip, Stepper } from '../components/UI';
import { GuideButton } from '../components/GuideModal';
import { RULES, WEAK_GPS } from '../constants';
import { emitAck, getSocket } from '../net';
import type { Perm } from '../useGps';
import type { Lobby as LobbyT, Settings } from '../types';
import { C } from '../theme';

export function Lobby({
  lobby,
  myId,
  perm,
  fake,
  serverUrl,
  onLeave,
}: {
  lobby: LobbyT;
  myId: string;
  perm: Perm;
  fake: boolean;
  serverUrl?: string;
  onLeave: () => void;
}) {
  useKeepAwake();
  const [rules, setRules] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const [starting, setStarting] = useState(false);
  const isHost = lobby.hostId === myId;
  const st = lobby.settings;
  const online = lobby.players.filter((p) => p.connected);
  const me = lobby.players.find((p) => p.id === myId);
  const gpsOk = !!me?.gps.ok;
  const maxChors = Math.max(1, online.length - 1);

  const set = (patch: Partial<Settings>) => getSocket()?.emit('room:settings', patch);
  const chors = st.chors ?? lobby.suggestedChors;

  const inviteText = `Chor-Police LIVE! Room Code: ${lobby.code}${serverUrl ? ` | Server: ${serverUrl}` : ''}`;
  const qrData = JSON.stringify({ code: lobby.code, server: serverUrl });

  const copyInvite = async () => {
    await Clipboard.setStringAsync(inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const start = async () => {
    setErr('');
    setStarting(true);
    const r = await emitAck('game:start');
    setStarting(false);
    if (!r.ok) setErr(r.msg ?? 'Game shuru nahi ho paya');
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <Text style={s.dim}>ROOM CODE</Text>
        <Text style={s.code}>{lobby.code}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Btn
            small
            ghost
            color={C.police}
            title={showQr ? 'Chhupao QR' : '📷 Scan QR'}
            onPress={() => setShowQr(!showQr)}
          />
          <Btn
            small
            ghost
            color={C.chor}
            title={copied ? '✓ Copied!' : '📋 Copy Info'}
            onPress={copyInvite}
          />
          <Btn
            small
            ghost
            color={C.dim}
            title="📤 Share"
            onPress={() => Share.share({ message: `Chor-Police khelte hain! App kholo → Join → room code: ${lobby.code}` })}
          />
        </View>

        {showQr && (
          <View style={s.qrBox}>
            <QRCode value={qrData} size={160} backgroundColor="#FFFFFF" color="#0A0E1A" />
            <Text style={s.qrHint}>Dost isko scan karein ya Room Code daalein</Text>
            {serverUrl ? <Text style={s.serverHint}>Server: {serverUrl}</Text> : null}
          </View>
        )}
      </Card>

      {perm === 'denied' && (
        <Card style={{ borderColor: C.danger, gap: 8 }}>
          <Text style={{ color: C.danger, fontWeight: '800' }}>📍 Location permission band hai</Text>
          <Text style={s.dim}>Bina location ke radar nahi chalega. Settings mein "While using the app" allow karo.</Text>
          <Btn small title="Settings kholo" onPress={() => Linking.openSettings()} color={C.danger} />
        </Card>
      )}
      {fake && (
        <Card style={{ borderColor: C.ok }}>
          <Text style={{ color: C.ok, fontWeight: '800' }}>🧪 Test mode ON — fake GPS use ho raha hai</Text>
        </Card>
      )}

      <Card>
        <Text style={s.h}>
          Players ({online.length}/12)
        </Text>
        {lobby.players.map((p) => (
          <View key={p.id} style={s.row}>
            <Text style={s.name} numberOfLines={1}>
              {p.isHost ? '👑 ' : ''}
              {p.name}
              {p.id === myId ? '  (tum)' : ''}
            </Text>
            {!p.connected ? (
              <Chip text="offline" color={C.danger} />
            ) : p.gps.ok && (p.gps.acc ?? 99) <= WEAK_GPS ? (
              <Chip text={`GPS ✓ ±${p.gps.acc}m`} color={C.ok} />
            ) : p.gps.ok ? (
              <Chip text={`GPS weak ±${p.gps.acc}m`} color={C.warn} />
            ) : (
              <Chip text="GPS dhundh raha…" color={C.warn} />
            )}
          </View>
        ))}
        {!gpsOk && perm !== 'denied' && <Text style={[s.dim, { marginTop: 8 }]}>Khule aasman ke neeche jao — GPS lock hone mein 10-20 second lagte hain.</Text>}
      </Card>

      <Card>
        <Text style={s.h}>Game settings {isHost ? '' : '(host badal sakta hai)'}</Text>
        <Stepper label="📍 Zone ka radius" value={`${st.radius} m`} editable={isHost} onMinus={() => set({ radius: st.radius - 25 })} onPlus={() => set({ radius: st.radius + 25 })} />
        <Stepper label="⏱️ Game ka time" value={`${Math.round(st.duration / 60)} min`} editable={isHost} onMinus={() => set({ duration: st.duration - 60 })} onPlus={() => set({ duration: st.duration + 60 })} />
        <Stepper
          label="😈 Chors ki ginti"
          value={st.chors === null ? `Auto (${lobby.suggestedChors})` : String(st.chors)}
          editable={isHost}
          onMinus={() => set({ chors: Math.max(1, chors - 1) })}
          onPlus={() => set({ chors: Math.min(maxChors, chors + 1) })}
        />
        <Stepper label="💰 Maal ki ginti" value={String(st.loot)} editable={isHost} onMinus={() => set({ loot: st.loot - 1 })} onPlus={() => set({ loot: st.loot + 1 })} />
        <Stepper
          label="🙈 Chors ka head-start"
          value={st.headStart === 0 ? 'Nahi' : `${st.headStart} s`}
          editable={isHost}
          onMinus={() => set({ headStart: st.headStart - 10 })}
          onPlus={() => set({ headStart: st.headStart + 10 })}
        />
        <Text style={[s.dim, { marginTop: 6 }]}>Zone ka center = start dabate waqt host ki location.</Text>
      </Card>

      <Card>
        <GuideButton label="📖 Game Kaise Khelte Hain? (Poori Guide)" />
      </Card>

      {isHost ? (
        <View style={{ gap: 8 }}>
          <Btn title={starting ? 'Shuru ho raha hai…' : '🚨  GAME SHURU KARO'} color={C.chor} disabled={starting || online.length < 2 || !gpsOk} onPress={start} />
          {online.length < 2 && <Text style={s.center}>Kam se kam 2 players chahiye</Text>}
          {online.length >= 2 && !gpsOk && <Text style={s.center}>Pehle apna GPS lock hone do</Text>}
          {err ? <Text style={[s.center, { color: C.danger }]}>{err}</Text> : null}
        </View>
      ) : (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>⏳ Host ke game shuru karne ka intezaar…</Text>
        </Card>
      )}
      <Btn title="Room chhodo" ghost small color={C.dim} onPress={onLeave} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 14, gap: 12, paddingBottom: 40 },
  dim: { color: C.dim, fontSize: 13, lineHeight: 19 },
  code: { color: C.text, fontSize: 58, fontWeight: '900', letterSpacing: 12, marginLeft: 12 },
  h: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  name: { color: C.text, fontSize: 16, fontWeight: '600', flex: 1, paddingRight: 8 },
  rule: { color: C.text, fontSize: 14, lineHeight: 21, marginTop: 10 },
  center: { color: C.dim, textAlign: 'center', fontSize: 13 },
  qrBox: { marginTop: 12, alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16 },
  qrHint: { color: '#0A0E1A', fontSize: 12, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  serverHint: { color: '#4B5563', fontSize: 11, fontFamily: 'monospace', marginTop: 4, textAlign: 'center' },
});
