import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Btn, Card, Chip } from '../components/UI';
import { GuideButton } from '../components/GuideModal';
import { UpdateModal } from '../components/UpdateModal';
import { checkForUpdate, CURRENT_VERSION, UpdateInfo } from '../updater';
import { detectLanServer, normalizeServerUrl, testServerConnection } from '../discovery';
import type { Conn } from '../useGame';
import type { Prefs } from '../storage';
import type { Ack } from '../types';
import { C } from '../theme';

export function Home({
  prefs,
  setPrefs,
  conn,
  onCreate,
  onJoin,
}: {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  conn: Conn;
  onCreate: () => Promise<Ack>;
  onJoin: (code: string) => Promise<Ack>;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adv, setAdv] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');
  const [renderInput, setRenderInput] = useState('');
  const [testingServer, setTestingServer] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  // Auto-check for server updates when serverUrl is set
  useEffect(() => {
    if (prefs.serverUrl) {
      checkForUpdate(prefs.serverUrl).then((u) => {
        if (u && u.hasUpdate) setUpdateInfo(u);
      });
    }
  }, [prefs.serverUrl]);

  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus('Updates check kar rahe hain…');
    const u = await checkForUpdate(prefs.serverUrl);
    setCheckingUpdate(false);
    if (u && u.hasUpdate) {
      setUpdateInfo(u);
      setUpdateStatus('');
    } else {
      setUpdateStatus('✓ App updated hai! Koi naya version nahi hai.');
      setTimeout(() => setUpdateStatus(''), 4000);
    }
  };

  const handleConnectRender = async (customUrl?: string) => {
    const raw = (customUrl ?? renderInput).trim() || prefs.serverUrl;
    if (!raw) {
      setTestResult({ ok: false, msg: 'Pehle Render URL ya app name daalo' });
      return;
    }
    const normalized = normalizeServerUrl(raw);
    setPrefs({ ...prefs, serverUrl: normalized });
    setTestingServer(true);
    setTestResult(null);
    const res = await testServerConnection(normalized);
    setTestingServer(false);
    setTestResult(res);
  };

  const run = async (fn: () => Promise<Ack>) => {
    if (!prefs.name.trim()) return setError('Pehle apna naam daalo 🙂');
    setError('');
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setError(r.msg ?? 'Kuch gadbad ho gayi');
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    setDetectMsg('Local Wi-Fi pe server dhundh rahe hain…');
    const url = await detectLanServer(prefs.serverUrl);
    setDetecting(false);
    if (url) {
      setPrefs({ ...prefs, serverUrl: url });
      setDetectMsg(`✓ Server mil gaya: ${url}`);
    } else {
      setDetectMsg('Nahi mila. Check karein laptop/host server chalu hai aur phone same Wi-Fi pe hai.');
    }
    setTimeout(() => setDetectMsg(''), 5000);
  };

  const handlePasteInvite = async () => {
    try {
      const text = (await Clipboard.getStringAsync()) || '';
      if (!text.trim()) return;

      // Try JSON format from QR code: { code: 'ABCD', server: 'http://...' }
      try {
        const parsed = JSON.parse(text);
        if (parsed.code) {
          setCode(parsed.code.toUpperCase());
          if (parsed.server) {
            setPrefs({ ...prefs, serverUrl: parsed.server });
          }
          return;
        }
      } catch {
        // Not JSON
      }

      // Try matching 4-letter room code
      const codeMatch = text.match(/\b([A-Z]{4})\b/i);
      if (codeMatch) {
        setCode(codeMatch[1].toUpperCase());
      }
      // Try matching server URL
      const urlMatch = text.match(/(http:\/\/[^\s]+:\d+)/i);
      if (urlMatch) {
        setPrefs({ ...prefs, serverUrl: urlMatch[1] });
      }
    } catch {
      // ignore
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <View style={{ marginTop: 18, marginBottom: 22 }}>
          <Text style={s.kicker}>REAL DUNIYA · REAL DOST · LIVE RADAR</Text>
          <Text style={s.title}>
            CHOR <Text style={{ color: C.chor }}>/</Text> POLICE
          </Text>
          <Text style={s.sub}>Dost ke 12 meter paas aate hi radar chilla uthta hai. Chhupo, bhaago, pakdo, chhudao 🚔💰</Text>
        </View>

        <Card style={{ gap: 12 }}>
          <Text style={s.label}>Tumhara naam</Text>
          <TextInput
            value={prefs.name}
            onChangeText={(name) => setPrefs({ ...prefs, name })}
            placeholder="Jaise: Adi"
            placeholderTextColor={C.dim}
            maxLength={14}
            style={s.input}
          />
          <Btn title="🎮  Naya room banao" color={C.chor} onPress={() => run(onCreate)} disabled={busy} />
          <View style={s.orRow}>
            <View style={s.line} />
            <Text style={{ color: C.dim, fontSize: 12 }}>YA</Text>
            <View style={s.line} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z]/g, ''))}
              placeholder="ROOM CODE"
              placeholderTextColor={C.dim}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={4}
              style={[s.input, { flex: 1, minWidth: 0, textAlign: 'center', letterSpacing: 6, fontWeight: '800', fontSize: 20 }]}
            />
            <Btn title="Join" color={C.police} onPress={() => run(() => onJoin(code))} disabled={busy || code.length < 4} style={{ paddingHorizontal: 26 }} />
          </View>
          <Btn small ghost color={C.dim} title="📋 Paste Invite Code" onPress={handlePasteInvite} />
          {busy ? <Text style={s.info}>Server se connect ho raha hai…</Text> : null}
          {error ? <Text style={s.error}>{error}</Text> : null}
        </Card>

        <View style={{ marginTop: 14 }}>
          <GuideButton />
        </View>

        <View style={{ marginTop: 14 }}>
          <Btn title={adv ? '▾ Settings chhupao' : '⚙️ Server, LAN aur Settings'} ghost small color={C.dim} onPress={() => setAdv(!adv)} />
          {adv && (
            <Card style={{ marginTop: 12, gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.label}>Server URL (LAN / Online)</Text>
                <Chip text={conn === 'online' ? 'online' : conn === 'connecting' ? 'connecting…' : conn === 'offline' ? 'offline' : 'not connected'} color={conn === 'online' ? C.ok : C.dim} />
              </View>
              <TextInput
                value={prefs.serverUrl}
                onChangeText={(serverUrl) => setPrefs({ ...prefs, serverUrl })}
                placeholder="http://10.151.72.165:3000"
                placeholderTextColor={C.dim}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={s.input}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn
                  small
                  ghost
                  style={{ flex: 1 }}
                  color={C.police}
                  title={detecting ? '🔍 Scanning…' : '🔍 Wi-Fi Auto-Detect'}
                  disabled={detecting}
                  onPress={handleAutoDetect}
                />
                <Btn
                  small
                  ghost
                  style={{ flex: 1 }}
                  color={C.chor}
                  title={testingServer ? '⏳ Checking…' : '🌐 Test URL'}
                  disabled={testingServer}
                  onPress={() => handleConnectRender(prefs.serverUrl)}
                />
              </View>

              {detectMsg ? <Text style={[s.hint, { color: detectMsg.startsWith('✓') ? C.ok : C.warn }]}>{detectMsg}</Text> : null}
              {testResult ? <Text style={[s.hint, { color: testResult.ok ? C.ok : C.warn }]}>{testResult.msg}</Text> : null}

              <View style={s.divider} />

              <View style={{ gap: 8 }}>
                <Text style={s.label}>🌐 Connect to Render (Internet / 4G)</Text>
                <Text style={s.hint}>Render ka app name ya URL daalein (e.g. `chor-police-live` ya `https://xxxx.onrender.com`):</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    value={renderInput}
                    onChangeText={setRenderInput}
                    placeholder="chor-police-live"
                    placeholderTextColor={C.dim}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[s.input, { flex: 1 }]}
                  />
                  <Btn
                    small
                    color={C.chor}
                    title="Connect"
                    disabled={testingServer || !renderInput.trim()}
                    onPress={() => handleConnectRender()}
                  />
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.switchRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.label}>🔊 Sound Effects (SFX)</Text>
                  <Text style={s.hint}>Siren, radar blips, coin pickup aur arrest sounds.</Text>
                </View>
                <Switch value={prefs.sound ?? true} onValueChange={(sound) => setPrefs({ ...prefs, sound })} trackColor={{ true: C.ok, false: C.card2 }} />
              </View>

              <View style={s.switchRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.label}>🧭 Compass Radar Mode</Text>
                  <Text style={s.hint}>Phone ghumane par radar phone ki direction mein ghumta hai.</Text>
                </View>
                <Switch value={prefs.compass ?? true} onValueChange={(compass) => setPrefs({ ...prefs, compass })} trackColor={{ true: C.ok, false: C.card2 }} />
              </View>

              <View style={s.switchRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.label}>🧪 Test mode (fake GPS)</Text>
                  <Text style={s.hint}>Ghar baithe test karne ke liye: asli GPS ki jagah on-screen D-pad se chalte ho.</Text>
                </View>
                <Switch value={prefs.fake} onValueChange={(fake) => setPrefs({ ...prefs, fake })} trackColor={{ true: C.ok, false: C.card2 }} />
              </View>

              <View style={s.divider} />

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.label}>🔄 App Updates</Text>
                  <Chip text={`v${CURRENT_VERSION}`} color={C.dim} />
                </View>
                <Btn
                  small
                  ghost
                  color={C.chor}
                  title={checkingUpdate ? 'Checking…' : '🔄 Check for Updates'}
                  disabled={checkingUpdate}
                  onPress={handleManualCheckUpdate}
                />
                {updateStatus ? <Text style={[s.hint, { color: updateStatus.startsWith('✓') ? C.ok : C.warn }]}>{updateStatus}</Text> : null}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
      <UpdateModal update={updateInfo} onDismiss={() => setUpdateInfo(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 40 },
  kicker: { color: C.dim, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: C.text, fontSize: 42, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
  sub: { color: C.dim, fontSize: 15, lineHeight: 22, marginTop: 8 },
  label: { color: C.text, fontSize: 14, fontWeight: '700' },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, color: C.text, fontSize: 17, paddingHorizontal: 14, paddingVertical: 13 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: C.line },
  info: { color: C.dim, fontSize: 13, textAlign: 'center' },
  error: { color: C.danger, fontSize: 13, lineHeight: 19 },
  hint: { color: C.dim, fontSize: 12, lineHeight: 17 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
});
