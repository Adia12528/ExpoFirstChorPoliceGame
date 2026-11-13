import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { buzz } from './haptics';
import { closeSocket, emitAck, getSocket, openSocket } from './net';
import type { Prefs } from './storage';
import type { Ack, FeedItem, GameEvent, GameResult, GameView, Lobby } from './types';

export type Conn = 'idle' | 'connecting' | 'online' | 'offline';

export function useGame(prefs: Prefs | null) {
  const [conn, setConn] = useState<Conn>('idle');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const roomRef = useRef<string | null>(null);
  const prefsRef = useRef<Prefs | null>(prefs);
  const feedId = useRef(1);
  prefsRef.current = prefs;

  const pushFeed = useCallback((type: FeedItem['type'], text: string) => {
    const id = feedId.current++;
    setFeed((f) => [...f.slice(-2), { id, type, text }]);
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 7000);
  }, []);

  const resetRoomState = useCallback(() => {
    roomRef.current = null;
    setRoomCode(null);
    setLobby(null);
    setView(null);
    setResult(null);
    setFeed([]);
  }, []);

  const listen = useCallback(
    (s: Socket) => {
      s.on('connect', () => {
        setConn('online');
        // after a network blip, re-attach to the same room as the same player
        const p = prefsRef.current;
        if (roomRef.current && p) {
          s.emit('room:join', { code: roomRef.current, name: p.name, playerId: p.playerId }, (r: Ack) => {
            if (!r || !r.ok) {
              resetRoomState();
              pushFeed('warn', r?.msg ?? 'Room se connection toot gaya');
            }
          });
        }
      });
      s.on('disconnect', () => setConn('offline'));
      s.on('connect_error', () => setConn('offline'));
      s.on('lobby', (l: Lobby) => {
        setLobby(l);
        if (l.phase === 'lobby') {
          setView(null);
          setResult(null);
        }
        if (l.phase === 'over' && l.result) setResult(l.result);
      });
      s.on('game:view', (v: GameView) => setView(v));
      s.on('game:over', (r: GameResult) => {
        setResult(r);
        buzz('heavy');
      });
      s.on('game:event', (e: GameEvent) => {
        if (e.haptic) buzz(e.haptic);
        pushFeed(e.type, e.msg);
      });
    },
    [pushFeed, resetRoomState],
  );

  /** open the socket and wait (max 8s) until it is connected */
  const connect = useCallback(
    (url: string) =>
      new Promise<{ ok: boolean; msg?: string }>((resolve) => {
        setConn('connecting');
        const s = openSocket(url);
        listen(s);
        const timer = setTimeout(() => {
          s.off('connect', onUp);
          closeSocket();
          setConn('offline');
          resolve({ ok: false, msg: `Server se connect nahi ho paa raha (${url}). Server chal raha hai? Phone aur laptop same WiFi pe hain?` });
        }, 8000);
        const onUp = () => {
          clearTimeout(timer);
          resolve({ ok: true });
        };
        s.once('connect', onUp);
      }),
    [listen],
  );

  const enter = useCallback(
    async (event: 'room:create' | 'room:join', payload: Record<string, unknown>) => {
      const p = prefsRef.current;
      if (!p) return { ok: false, msg: 'Thoda ruko…' } as Ack;
      const up = await connect(p.serverUrl.trim());
      if (!up.ok) return up as Ack;
      const r = await emitAck<Ack>(event, { ...payload, name: p.name.trim(), playerId: p.playerId });
      if (r.ok && r.code) {
        roomRef.current = r.code;
        setRoomCode(r.code);
      } else {
        closeSocket();
        setConn('idle');
      }
      return r;
    },
    [connect],
  );

  const createRoom = useCallback(() => enter('room:create', {}), [enter]);
  const joinRoom = useCallback((code: string) => enter('room:join', { code: code.trim().toUpperCase() }), [enter]);

  const leave = useCallback(() => {
    getSocket()?.emit('room:leave');
    closeSocket();
    resetRoomState();
    setConn('idle');
  }, [resetRoomState]);

  useEffect(() => () => closeSocket(), []);

  return { conn, roomCode, lobby, view, result, feed, createRoom, joinRoom, leave };
}
