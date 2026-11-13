import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Btn } from './src/components/UI';
import { RoleRevealModal } from './src/components/RoleRevealModal';
import { DEFAULT_SERVER_URL } from './src/constants';
import { getSocket } from './src/net';
import { Game } from './src/screens/Game';
import { Home } from './src/screens/Home';
import { Lobby } from './src/screens/Lobby';
import { Result } from './src/screens/Result';
import { loadPrefs, Prefs, savePrefs } from './src/storage';
import { setSoundEnabled } from './src/sound';
import { C, roleBgColor } from './src/theme';
import { useGame } from './src/useGame';
import { useGps } from './src/useGps';

export default function App() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [revealRole, setRevealRole] = useState<'chor' | 'police' | null>(null);
  const [hasRevealed, setHasRevealed] = useState(false);

  useEffect(() => {
    // Safety timer to guarantee splash screen dismisses within 800ms no matter what
    const hideTimer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 800);

    loadPrefs({ name: '', serverUrl: DEFAULT_SERVER_URL, fake: false, sound: true, compass: true })
      .then((p) => {
        setPrefs(p);
        setSoundEnabled(p.sound ?? true);
        clearTimeout(hideTimer);
        void SplashScreen.hideAsync().catch(() => {});
      })
      .catch(() => {
        setPrefs({ name: '', serverUrl: DEFAULT_SERVER_URL, fake: false, sound: true, compass: true, playerId: 'p_' + Date.now() });
        clearTimeout(hideTimer);
        void SplashScreen.hideAsync().catch(() => {});
      });

    return () => clearTimeout(hideTimer);
  }, []);

  useEffect(() => {
    if (prefs) {
      void savePrefs(prefs);
      setSoundEnabled(prefs.sound ?? true);
    }
  }, [prefs]);

  const game = useGame(prefs);
  const gps = useGps(!!game.roomCode, !!prefs?.fake);
  const { roomCode, leave } = game;

  // Trigger Role Reveal animation when transitioning from lobby to game
  useEffect(() => {
    if (game.view && (game.view.phase === 'headstart' || game.view.phase === 'playing')) {
      if (!hasRevealed && game.view.role) {
        setRevealRole(game.view.role);
        setHasRevealed(true);
      }
    } else {
      setHasRevealed(false);
    }
  }, [game.view, hasRevealed]);

  // stream my GPS fix to the server once a second (only fresh fixes — never replay stale data)
  useEffect(() => {
    if (!roomCode) return;
    const id = setInterval(() => {
      const f = gps.fixRef.current;
      const s = getSocket();
      if (f && s && s.connected && Date.now() - f.recv < 6000) s.emit('loc', { lat: f.lat, lon: f.lon, acc: f.acc });
    }, 1000);
    return () => clearInterval(id);
  }, [roomCode, gps.fixRef]);

  // Android back button inside a room => confirm instead of silently dropping out of the game
  useEffect(() => {
    if (!roomCode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Room chhodna hai?', undefined, [
        { text: 'Ruko', style: 'cancel' },
        { text: 'Chhodo', style: 'destructive', onPress: leave },
      ]);
      return true;
    });
    return () => sub.remove();
  }, [roomCode, leave]);

  let body: React.ReactNode;
  const currentRole = game.view?.role ?? null;
  const activeBg = (game.view && (game.view.phase === 'headstart' || game.view.phase === 'playing'))
    ? roleBgColor(currentRole)
    : C.bg;

  if (!prefs) {
    body = (
      <View style={s.center}>
        <ActivityIndicator color={C.chor} size="large" />
      </View>
    );
  } else if (!game.roomCode) {
    body = <Home prefs={prefs} setPrefs={setPrefs} conn={game.conn} onCreate={game.createRoom} onJoin={game.joinRoom} />;
  } else if (game.result) {
    body = (
      <Result
        result={game.result}
        myId={prefs.playerId}
        isHost={game.lobby?.hostId === prefs.playerId}
        onRematch={() => getSocket()?.emit('game:reset')}
        onLeave={game.leave}
      />
    );
  } else if (game.view && (game.view.phase === 'headstart' || game.view.phase === 'playing')) {
    body = (
      <Game
        view={game.view}
        feed={game.feed}
        fake={prefs.fake}
        fakeMove={gps.fakeMove}
        compassEnabled={prefs.compass}
        onToggleCompass={() => setPrefs({ ...prefs, compass: !prefs.compass })}
        onLeave={game.leave}
      />
    );
  } else if (game.lobby) {
    body = (
      <Lobby
        lobby={game.lobby}
        myId={prefs.playerId}
        perm={gps.perm}
        fake={prefs.fake}
        serverUrl={prefs.serverUrl}
        onLeave={game.leave}
      />
    );
  } else {
    body = (
      <View style={s.center}>
        <ActivityIndicator color={C.chor} size="large" />
        <Text style={{ color: C.dim, marginVertical: 14 }}>Room se jud raha hoon…</Text>
        <Btn title="Wapas jao" ghost small color={C.dim} onPress={game.leave} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={[s.root, { backgroundColor: activeBg }]} edges={['top', 'bottom']}>
        {body}
        <RoleRevealModal
          visible={!!revealRole}
          role={revealRole}
          onFinish={() => setRevealRole(null)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
