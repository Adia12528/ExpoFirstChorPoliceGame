import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Btn, Card, Chip } from '../components/UI';
import { GuideButton } from '../components/GuideModal';
import { UpdateModal } from '../components/UpdateModal';
import { checkForUpdate, CURRENT_VERSION, UpdateInfo } from '../updater';
import { detectLanServer, normalizeServerUrl, testServerConnection } from '../discovery';
import type { Conn } from '../useGame';
import type { Prefs } from '../storage';
import type { Ack } from '../types';
import { DEFAULT_SERVER_URL, OFFICIAL_RENDER_URL } from '../constants';
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
  const [copyFeedback, setCopyFeedback] = useState('');

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

  const handleCopyRenderUrl = async () => {
    await Clipboard.setStringAsync(OFFICIAL_RENDER_URL);
    setCopyFeedback('✓ Render URL Copied!');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  const handleUseOfficialRender = () => {
    setPrefs({ ...prefs, serverUrl: OFFICIAL_RENDER_URL });
    setCopyFeedback('✓ Render URL set as server!');
    setTimeout(() => setCopyFeedback(''), 3000);
    handleConnectRender(OFFICIAL_RENDER_URL);
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
        {/* Hero Header with Custom App Logo and Badges */}
        <View style={s.heroContainer}>
          <View style={s.logoWrapper}>
            <Image
              source={require('../../assets/icon.png')}
              style={s.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={s.badgeRow}>
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>GPS MULTIPLAYER</Text>
            </View>
            <View style={s.radarChip}>
              <Text style={s.radarChipText}>12M RADAR</Text>
            </View>
          </View>
          <Text style={s.title}>
            CHOR <Text style={{ color: C.chor }}>/</Text> POLICE
          </Text>
          <Text style={s.sub}>
            Asli maidan mein bhaago, chhupo, pakdo aur maal churao! 🏃‍♂️🚨
          </Text>
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.label}>🌐 Official Render Server</Text>
                  <Chip text="Online 4G/WiFi" color={C.ok} />
                </View>
                <Text style={s.hint}>Default server: {OFFICIAL_RENDER_URL}</Text>
                
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn
                    small
                    style={{ flex: 1 }}
                    color={C.police}
                    title="📋 Copy Render URL"
                    onPress={handleCopyRenderUrl}
                  />
                  <Btn
                    small
                    style={{ flex: 1 }}
                    color={C.chor}
                    title="⚡ Reset to Default"
                    onPress={handleUseOfficialRender}
                  />
                </View>

                {copyFeedback ? <Text style={[s.hint, { color: C.ok }]}>{copyFeedback}</Text> : null}

                <View style={s.divider} />

                <Text style={s.label}>Custom Server URL badalna ho to:</Text>
                <Text style={s.hint}>Agar apna koi naya Render URL ya Wi-Fi link lagana hai:</Text>
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
  heroContainer: { alignItems: 'center', marginTop: 10, marginBottom: 18 },
  logoWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#121829',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#232E4A',
    shadowColor: '#4C8DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 10,
  },
  logoImage: { width: 86, height: 86, borderRadius: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B4A22',
    borderWidth: 1,
    borderColor: '#FF3B4A88',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B4A' },
  liveText: { color: '#FF5A5F', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  radarChip: {
    backgroundColor: '#4C8DFF22',
    borderWidth: 1,
    borderColor: '#4C8DFF88',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  radarChipText: { color: '#4C8DFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: C.text, fontSize: 34, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  sub: { color: C.dim, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 },
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
