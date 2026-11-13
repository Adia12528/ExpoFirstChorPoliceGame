'use strict';
/**
 * CHOR-POLICE LIVE — realtime game server
 * ---------------------------------------
 * Server-authoritative: phones only send their own GPS fix; the server decides who is
 * near whom, who got arrested, who got freed, which loot was grabbed, and — importantly —
 * sends every player ONLY what their role is allowed to see (positions are sent relative
 * to the receiving player, so a chor can never read police coordinates out of the network
 * traffic). In-memory only, no database.
 */
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Server } = require('socket.io');
const { offset, dist, destination } = require('./geo');

function getLocalIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  return results;
}

const DEFAULTS = {
  ARREST_RANGE: 12, // m — police must be this close (and hold the button) to arrest
  FREE_RANGE: 12, // m — a free chor must be this close to a jail marker to break it
  LOOT_RANGE: 10, // m — auto-collect radius for loot
  MAX_ACC: 30, // m — worse GPS accuracy than this cannot arrest / free / loot
  STALE_MS: 8000, // a GPS fix older than this counts as "no signal"
  DROP_MS: 60000, // no packets for this long => player is considered gone
  POLICE_SENSE: 20, // m — police see chors as radar blips inside this range
  CHOR_SENSE: 25, // m — chors see police as radar blips inside this range
  IMMUNITY_MS: 10000, // freed chors cannot be re-arrested for this long
  CCTV_FIRST: 60, // s after play starts
  CCTV_EVERY: 90, // s between CCTV sweeps
  CCTV_WARN: 5, // s of warning before a sweep
  CCTV_LIVE: 6, // s all free chors are visible to police
  MAX_PLAYERS: 12,
  TICK_MS: 1000,
  LOBBY_GRACE_MS: 15000, // disconnected lobby players are removed after this
  EMPTY_ROOM_MS: 10 * 60 * 1000,
};

const autoChors = (n) => Math.max(1, Math.min(n - 1, Math.round(n * 0.38)));
const clamp = (v, min, max, def) => (Number.isFinite(+v) ? Math.max(min, Math.min(max, Math.round(+v))) : def);
const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 14);

function createServer(overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  const httpServer = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `http://${host}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const ips = getLocalIps();
      return res.end(JSON.stringify({
        status: 'online',
        app: 'chor-police-server',
        version: '1.0.0',
        activeRooms: rooms.size,
        ips: ips.map((i) => i.address),
        defaults: DEFAULTS,
      }));
    }

    if (pathname === '/download' || pathname === '/download/app.apk' || pathname === '/chor-police.apk') {
      const candidates = [
        path.join(__dirname, '../app/android/app/build/outputs/apk/release/app-release.apk'),
        path.join(__dirname, '../app/android/app/build/outputs/apk/debug/app-debug.apk'),
        path.join(__dirname, '../dist/chor-police.apk'),
        path.join(__dirname, 'chor-police.apk'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          res.writeHead(200, {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': 'attachment; filename="chor-police-live.apk"',
            'Content-Length': fs.statSync(p).size,
          });
          return fs.createReadStream(p).pipe(res);
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Android APK abhi build ho raha hai ya nahi mila.');
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const ips = getLocalIps();
    const primaryIp = ips[0]?.address || '127.0.0.1';
    const serverPort = httpServer.address() ? httpServer.address().port : 3000;
    const connectUrl = `http://${primaryIp}:${serverPort}`;

    let qrSvg = '';
    try {
      qrSvg = await QRCode.toString(connectUrl, { type: 'svg', margin: 1, width: 200 });
    } catch {
      qrSvg = '';
    }

    const totalPlayers = [...rooms.values()].reduce((acc, r) => acc + r.players.size, 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chor-Police LIVE Server</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0A0E1A; color: #E8EEF8; font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; padding: 24px 16px; }
    .card { background: #131B2E; border: 1px solid #1E2B47; border-radius: 18px; max-width: 520px; width: 100%; padding: 26px; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
    h1 { font-size: 26px; font-weight: 900; letter-spacing: 1px; margin-bottom: 6px; }
    .chor { color: #FF3B4A; }
    .police { color: #2E86DE; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 700; background: #10B98122; color: #10B981; border: 1px solid #10B98155; margin-bottom: 14px; }
    .sub { color: #8C9BB4; font-size: 14px; line-height: 1.5; margin-bottom: 14px; }
    .label { color: #8C9BB4; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .ip-box { background: #0A0E1A; border: 1px solid #1E2B47; border-radius: 12px; padding: 12px 14px; margin: 8px 0 16px 0; font-family: monospace; font-size: 17px; color: #10B981; font-weight: bold; word-break: break-all; }
    .center { text-align: center; }
    .qr-wrap { background: white; padding: 12px; border-radius: 12px; display: inline-block; margin: 12px auto; }
    .btn { display: block; text-align: center; background: #FF3B4A; color: white; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; margin-top: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
    .stat { background: #0A0E1A; border: 1px solid #1E2B47; border-radius: 10px; padding: 12px; text-align: center; }
    .stat-val { font-size: 22px; font-weight: 900; }
    .stat-lbl { font-size: 11px; color: #8C9BB4; text-transform: uppercase; margin-top: 4px; }
    .steps { background: #0A0E1A; border-radius: 12px; padding: 14px; margin-top: 16px; font-size: 13px; color: #8C9BB4; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">● SERVER CHAL RAHA HAI</span>
    <h1>CHOR <span class="chor">/</span> <span class="police">POLICE</span> LIVE</h1>
    <p class="sub">GPS Radar Multiplayer Game for Real-World Play with Friends.</p>

    <div class="label">Dosto ke Phone ke liye Server URL:</div>
    <div class="ip-box">${connectUrl}</div>

    <div class="center">
      <div class="qr-wrap">${qrSvg}</div>
      <p style="color: #8C9BB4; font-size: 12px;">App mein Auto-Detect karein ya ye QR code scan karein</p>
    </div>

    <a href="/download/app.apk" class="btn">📲 Download Android APK (.apk)</a>

    <div class="grid">
      <div class="stat">
        <div class="stat-val chor">${rooms.size}</div>
        <div class="stat-lbl">Active Rooms</div>
      </div>
      <div class="stat">
        <div class="stat-val police">${totalPlayers}</div>
        <div class="stat-lbl">Connected Players</div>
      </div>
    </div>

    <div class="steps">
      <b style="color:#E8EEF8;">LAN / WiFi pe dosto ke sath kaise khele:</b><br/>
      1. Sabhi phones same Wi-Fi ya Mobile Hotspot se connect hon.<br/>
      2. App ke Home screen pe <b>Auto-Detect</b> dabao ya upar ka URL daalo.<br/>
      3. Ek dost Room banaye aur baaki dost 4-letter code daal kar join karein!
    </div>
  </div>
</body>
</html>`;
    res.end(html);
  });
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    pingInterval: 5000,
    pingTimeout: 9000,
  });

  /** @type {Map<string, any>} */
  const rooms = new Map();
  /** socket.id -> { code, playerId } */
  const bySocket = new Map();

  const now = () => Date.now();
  const fresh = (p) => !!p.pos && now() - p.pos.ts <= cfg.STALE_MS;
  const active = (p) => now() - p.lastSeen < cfg.DROP_MS;

  /* ----------------------------------------------------------------- rooms */

  function makeCode() {
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let c;
    do {
      c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
    } while (rooms.has(c));
    return c;
  }

  function newRoom(code) {
    const room = {
      code,
      hostId: null,
      phase: 'lobby', // lobby | headstart | playing | over
      players: new Map(),
      settings: { radius: 150, duration: 600, chors: null, loot: 6, headStart: 30 },
      center: null,
      loot: [],
      phaseEndsAt: 0,
      cctv: { nextAt: 0, warned: false, liveUntil: 0 },
      result: null,
      emptySince: null,
      timer: null,
    };
    room.timer = setInterval(() => tick(room), cfg.TICK_MS);
    rooms.set(code, room);
    return room;
  }

  function deleteRoom(room) {
    clearInterval(room.timer);
    for (const p of room.players.values()) bySocket.delete(p.socketId);
    rooms.delete(room.code);
  }

  function uniqueName(room, name, selfId) {
    let n = name;
    let i = 2;
    const taken = (x) => [...room.players.values()].some((p) => p.id !== selfId && p.name.toLowerCase() === x.toLowerCase());
    while (taken(n)) n = `${name.slice(0, 11)} ${i++}`;
    return n;
  }

  function attach(socket, room, playerId, name) {
    let p = room.players.get(playerId);
    if (p) {
      bySocket.delete(p.socketId);
      p.socketId = socket.id;
      p.connected = true;
      p.lastSeen = now();
    } else {
      p = {
        id: playerId,
        name: uniqueName(room, name, playerId),
        socketId: socket.id,
        connected: true,
        disconnectedAt: 0,
        lastSeen: now(),
        pos: null,
        role: null,
        status: 'free', // free | jailed
        immuneUntil: 0,
        stealthUntil: 0,
        boostUntil: 0,
        abilityCooldownUntil: 0,
        jail: null,
        outside: false,
        stats: { arrests: 0, frees: 0, loot: 0 },
      };
      room.players.set(playerId, p);
    }
    bySocket.set(socket.id, { code: room.code, playerId });
    socket.join(room.code);
    room.emptySince = null;
    return p;
  }

  function ctxOf(socket) {
    const c = bySocket.get(socket.id);
    if (!c) return {};
    const room = rooms.get(c.code);
    const p = room && room.players.get(c.playerId);
    return { room, p };
  }

  function removePlayer(room, p) {
    bySocket.delete(p.socketId);
    room.players.delete(p.id);
    if (room.hostId === p.id) {
      const next = [...room.players.values()].find((x) => x.connected) || [...room.players.values()][0];
      room.hostId = next ? next.id : null;
    }
  }

  /* --------------------------------------------------------------- emitters */

  const toPlayer = (p, ev) => {
    if (p.connected) io.to(p.socketId).emit('game:event', ev);
  };
  const toAll = (room, ev, filter) => {
    for (const p of room.players.values()) if (!filter || filter(p)) toPlayer(p, ev);
  };

  function lobbyPayload(room) {
    const players = [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      isHost: p.id === room.hostId,
      gps: p.pos ? { ok: fresh(p), acc: Math.round(p.pos.acc) } : { ok: false, acc: null },
    }));
    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      settings: room.settings,
      suggestedChors: autoChors(players.filter((p) => p.connected).length || 1),
      players,
      result: room.phase === 'over' ? room.result : null,
    };
  }

  function broadcastLobby(room) {
    io.to(room.code).emit('lobby', lobbyPayload(room));
  }

  /* ------------------------------------------------------------------ views */

  function heatLevel(d, bands) {
    // bands: ascending thresholds for levels 4,3,2,1 (else 0)
    if (d <= bands[0]) return 4;
    if (d <= bands[1]) return 3;
    if (d <= bands[2]) return 2;
    if (d <= bands[3]) return 1;
    return 0;
  }

  function cctvState(room, t) {
    if (room.phase !== 'playing') return { state: 'idle', inSec: 0 };
    if (t < room.cctv.liveUntil) return { state: 'live', inSec: Math.ceil((room.cctv.liveUntil - t) / 1000) };
    const inSec = Math.max(0, Math.ceil((room.cctv.nextAt - t) / 1000));
    return { state: room.cctv.warned ? 'warning' : 'idle', inSec };
  }

  function viewFor(room, p, t) {
    const isChor = p.role === 'chor';
    const all = [...room.players.values()];
    const chors = all.filter((x) => x.role === 'chor');
    const isStealthed = isChor && (p.stealthUntil || 0) > t;
    const isBoosted = !isChor && (p.boostUntil || 0) > t;
    const abilityReady = (p.abilityCooldownUntil || 0) <= t && room.phase === 'playing' && p.status === 'free';

    const view = {
      phase: room.phase,
      role: p.role,
      status: p.status,
      immuneLeft: Math.max(0, Math.ceil((p.immuneUntil - t) / 1000)),
      timeLeft: Math.max(0, Math.ceil((room.phaseEndsAt - t) / 1000)),
      blind: !isChor && room.phase === 'headstart',
      me: { signal: fresh(p), acc: p.pos ? Math.round(p.pos.acc) : null, outside: p.outside },
      zone: null,
      allies: [],
      foes: [],
      jails: [],
      loot: [],
      heat: null,
      cctv: cctvState(room, t),
      ability: {
        name: isChor ? 'dhuaan' : 'boost',
        ready: abilityReady,
        active: isChor ? isStealthed : isBoosted,
        cooldownLeft: Math.max(0, Math.ceil(((p.abilityCooldownUntil || 0) - t) / 1000)),
        activeLeft: Math.max(0, Math.ceil(((isChor ? p.stealthUntil : p.boostUntil || 0) - t) / 1000)),
      },
      score: {
        loot: room.loot.filter((l) => l.taken).length,
        lootTotal: room.loot.length,
        chorsFree: chors.filter((c) => c.status === 'free' && active(c)).length,
        chorsTotal: chors.length,
      },
    };
    if (!fresh(p) || !room.center) return view;
    const me = p.pos;

    view.zone = { ...offset(me, room.center), r: room.settings.radius };

    // teammates — always visible to each other
    for (const a of all) {
      if (a.id === p.id || a.role !== p.role || !a.connected || !fresh(a)) continue;
      if (a.status === 'jailed') continue;
      view.allies.push({ id: a.id, name: a.name, ...offset(me, a.pos) });
    }

    // jail markers — visible to everyone
    if (room.phase !== 'headstart' || isChor) {
      for (const c of chors) {
        if (c.status === 'jailed' && c.jail) view.jails.push({ id: c.id, name: c.name, ...offset(me, c.jail) });
      }
    }

    // opponents
    if (room.phase === 'playing') {
      const cctvLive = t < room.cctv.liveUntil;
      let nearest = Infinity;
      const policeSense = isBoosted ? 35 : cfg.POLICE_SENSE;

      for (const o of all) {
        if (o.role === p.role || !o.role || !fresh(o) || !active(o)) continue;
        if (o.status !== 'free') continue;
        const d = dist(me, o.pos);
        const targetStealthed = o.role === 'chor' && (o.stealthUntil || 0) > t;

        if (isChor) {
          if (d < nearest) nearest = d;
          if (d <= cfg.CHOR_SENSE) view.foes.push({ id: o.id, name: o.name, kind: 'sense', ...offset(me, o.pos) });
        } else {
          // Police perspective: if chor is stealthed, they don't appear on sense or CCTV
          if (!targetStealthed) {
            if (d < nearest) nearest = d;
            if (d <= policeSense) {
              view.foes.push({ id: o.id, name: o.name, kind: 'sense', ...offset(me, o.pos) });
            } else if (cctvLive) {
              view.foes.push({ id: o.id, name: o.name, kind: 'cctv', ...offset(me, o.pos) });
            } else if (o.outside) {
              view.foes.push({ id: o.id, name: o.name, kind: 'zone', ...offset(me, o.pos) });
            }
          }
        }
      }
      if (nearest !== Infinity) {
        view.heat = isChor
          ? { kind: 'police', level: heatLevel(nearest, [cfg.ARREST_RANGE, 20, 35, 60]) }
          : { kind: 'chor', level: heatLevel(nearest, [cfg.ARREST_RANGE, 25, 50, 100]) };
      }
    }

    // loot is a chor-only objective
    if (isChor && room.phase !== 'over') {
      for (const l of room.loot) if (!l.taken) view.loot.push({ id: l.id, ...offset(me, l) });
    }
    return view;
  }

  function sendViews(room) {
    const t = now();
    for (const p of room.players.values()) {
      if (p.connected) io.to(p.socketId).emit('game:view', viewFor(room, p, t));
    }
  }

  /* ------------------------------------------------------------------- game */

  function spawnLoot(room) {
    const loot = [];
    const maxR = room.settings.radius * 0.75;
    for (let i = 0; i < room.settings.loot; i++) {
      let best = null;
      for (let tries = 0; tries < 200; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR;
        const pt = destination(room.center, Math.cos(a) * r, Math.sin(a) * r);
        if (loot.every((l) => dist(l, pt) >= 20)) {
          best = pt;
          break;
        }
        best = pt;
      }
      loot.push({ id: i + 1, lat: best.lat, lon: best.lon, taken: false });
    }
    return loot;
  }

  function beginPlaying(room) {
    room.phase = 'playing';
    const t = now();
    room.phaseEndsAt = t + room.settings.duration * 1000;
    room.cctv = { nextAt: t + cfg.CCTV_FIRST * 1000, warned: false, liveUntil: 0 };
    toAll(room, { type: 'start', haptic: 'heavy', msg: '🚨 Police khul gayi! Khel shuru!' });
  }

  function startGame(room) {
    const list = [...room.players.values()].filter((p) => p.connected);
    for (const p of [...room.players.values()]) if (!p.connected) removePlayer(room, p);
    const n = list.length;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    const nChors = clamp(room.settings.chors ?? autoChors(n), 1, n - 1, 1);
    shuffled.forEach((p, i) => {
      p.role = i < nChors ? 'chor' : 'police';
      p.status = 'free';
      p.jail = null;
      p.immuneUntil = 0;
      p.outside = false;
      p.stats = { arrests: 0, frees: 0, loot: 0 };
    });
    const host = room.players.get(room.hostId);
    room.center = { lat: host.pos.lat, lon: host.pos.lon };
    room.loot = spawnLoot(room);
    room.result = null;
    if (room.settings.headStart > 0) {
      room.phase = 'headstart';
      room.phaseEndsAt = now() + room.settings.headStart * 1000;
      for (const p of list) {
        toPlayer(p, {
          type: 'start',
          haptic: 'heavy',
          msg: p.role === 'chor' ? `😈 Tum CHOR ho! ${room.settings.headStart}s mein chhup jao.` : `👮 Tum POLICE ho! ${room.settings.headStart}s ruko, chor chhup rahe hain.`,
        });
      }
    } else {
      beginPlaying(room);
    }
    sendViews(room);
  }

  function finish(room, winner, reason) {
    if (room.phase === 'over') return;
    room.phase = 'over';
    const players = [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      status: p.status,
      ...p.stats,
    }));
    const score = (x) => x.arrests * 3 + x.frees * 3 + x.loot * 2;
    const mvp = [...players].sort((a, b) => score(b) - score(a))[0];
    room.result = {
      winner,
      reason,
      loot: room.loot.filter((l) => l.taken).length,
      lootTotal: room.loot.length,
      players,
      mvp: mvp && score(mvp) > 0 ? { id: mvp.id, name: mvp.name } : null,
    };
    broadcastLobby(room);
    io.to(room.code).emit('game:over', room.result);
  }

  function checkEnd(room) {
    if (room.phase !== 'playing') return;
    const t = now();
    const ps = [...room.players.values()];
    const chors = ps.filter((p) => p.role === 'chor' && active(p));
    const police = ps.filter((p) => p.role === 'police' && active(p));
    const lootLeft = room.loot.filter((l) => !l.taken).length;
    if (lootLeft === 0) return finish(room, 'chor', 'Saara maal loot liya gaya! 💰');
    if (chors.filter((c) => c.status === 'free').length === 0) {
      return finish(room, 'police', chors.length ? 'Saare chor ek saath jail mein! 🔒' : 'Saare chor bhaag gaye!');
    }
    if (police.length === 0) return finish(room, 'chor', 'Saari police gayab ho gayi!');
    if (t >= room.phaseEndsAt) return finish(room, 'police', 'Time khatam — chor saara maal nahi utha paaye! ⏱️');
  }

  function tick(room) {
    const t = now();

    // housekeeping
    if (room.phase === 'lobby') {
      for (const p of [...room.players.values()]) {
        if (!p.connected && t - p.disconnectedAt > cfg.LOBBY_GRACE_MS) removePlayer(room, p);
      }
    }
    const anyConnected = [...room.players.values()].some((p) => p.connected);
    if (!anyConnected) {
      if (!room.emptySince) room.emptySince = t;
      if (room.players.size === 0 || t - room.emptySince > cfg.EMPTY_ROOM_MS) return deleteRoom(room);
    } else {
      room.emptySince = null;
    }

    if (room.phase === 'lobby' || room.phase === 'over') return broadcastLobby(room);

    if (room.phase === 'headstart' && t >= room.phaseEndsAt) beginPlaying(room);

    // zone check
    for (const p of room.players.values()) {
      if (!fresh(p)) continue;
      const out = dist(room.center, p.pos) > room.settings.radius;
      if (out && !p.outside) {
        toPlayer(p, { type: 'warn', haptic: 'warning', msg: '⚠️ Tum khel ke zone se bahar ho! Wapas aao.' });
        if (p.role === 'chor') toAll(room, { type: 'info', msg: `📍 ${p.name} zone se bahar nikla — ab dikh raha hai!` }, (x) => x.role === 'police');
      }
      p.outside = out;
    }

    if (room.phase === 'playing') {
      // loot pickup (free chors only)
      for (const c of room.players.values()) {
        if (c.role !== 'chor' || c.status !== 'free' || !fresh(c) || c.pos.acc > cfg.MAX_ACC) continue;
        for (const l of room.loot) {
          if (l.taken || dist(c.pos, l) > cfg.LOOT_RANGE) continue;
          l.taken = true;
          c.stats.loot++;
          const got = room.loot.filter((x) => x.taken).length;
          toPlayer(c, { type: 'good', haptic: 'success', msg: `💰 Maal mila! (${got}/${room.loot.length})` });
          toAll(room, { type: 'info', msg: `💰 ${c.name} ne maal uthaya (${got}/${room.loot.length})` }, (x) => x.id !== c.id);
        }
      }

      // CCTV schedule
      const cc = room.cctv;
      if (!cc.warned && t >= cc.nextAt - cfg.CCTV_WARN * 1000 && t < cc.nextAt) {
        cc.warned = true;
        toAll(room, { type: 'cctv', haptic: 'warning', msg: `📹 CCTV ${cfg.CCTV_WARN}s mein ON — chor chhup jao!` }, (x) => x.role === 'chor');
        toAll(room, { type: 'cctv', msg: `📹 CCTV ${cfg.CCTV_WARN}s mein ON hoga` }, (x) => x.role === 'police');
      }
      if (t >= cc.nextAt) {
        cc.liveUntil = t + cfg.CCTV_LIVE * 1000;
        cc.nextAt = t + cfg.CCTV_EVERY * 1000;
        cc.warned = false;
        toAll(room, { type: 'cctv', haptic: 'heavy', msg: `📹 CCTV ON! Saare chor ${cfg.CCTV_LIVE}s ke liye dikh rahe hain.` });
      }

      checkEnd(room);
    }

    if (room.phase !== 'over') sendViews(room);
  }

  /* ----------------------------------------------------------------- sockets */

  io.on('connection', (socket) => {
    const leaveCurrent = () => {
      const { room, p } = ctxOf(socket);
      if (!room || !p) return;
      socket.leave(room.code);
      if (room.phase === 'lobby') removePlayer(room, p);
      else {
        p.connected = false;
        p.disconnectedAt = now();
        p.lastSeen = 0; // left on purpose => counts as gone immediately
        bySocket.delete(socket.id);
      }
      bySocket.delete(socket.id);
      if (room.players.size === 0) deleteRoom(room);
      else broadcastLobby(room);
    };

    socket.on('room:create', (data, ack) => {
      const name = cleanName(data && data.name);
      const playerId = String((data && data.playerId) || '').slice(0, 40);
      if (!name || !playerId) return ack && ack({ ok: false, msg: 'Pehle apna naam daalo' });
      leaveCurrent();
      const room = newRoom(makeCode());
      room.hostId = playerId;
      attach(socket, room, playerId, name);
      ack && ack({ ok: true, code: room.code });
      broadcastLobby(room);
    });

    socket.on('room:join', (data, ack) => {
      const name = cleanName(data && data.name);
      const playerId = String((data && data.playerId) || '').slice(0, 40);
      const code = String((data && data.code) || '').trim().toUpperCase();
      if (!name || !playerId) return ack && ack({ ok: false, msg: 'Pehle apna naam daalo' });
      const room = rooms.get(code);
      if (!room) return ack && ack({ ok: false, msg: 'Ye room code nahi mila' });
      const existing = room.players.get(playerId);
      if (!existing) {
        if (room.phase !== 'lobby') return ack && ack({ ok: false, msg: 'Game already chalu hai' });
        if (room.players.size >= cfg.MAX_PLAYERS) return ack && ack({ ok: false, msg: 'Room full hai' });
      }
      const cur = bySocket.get(socket.id);
      if (cur && cur.code !== code) leaveCurrent();
      attach(socket, room, playerId, name);
      ack && ack({ ok: true, code: room.code });
      broadcastLobby(room);
      if (room.phase === 'headstart' || room.phase === 'playing') sendViews(room);
    });

    socket.on('room:settings', (s) => {
      const { room, p } = ctxOf(socket);
      if (!room || !p || room.hostId !== p.id || room.phase !== 'lobby' || !s) return;
      const cur = room.settings;
      room.settings = {
        radius: clamp(s.radius ?? cur.radius, 50, 500, cur.radius),
        duration: clamp(s.duration ?? cur.duration, 120, 1800, cur.duration),
        chors: s.chors === undefined ? cur.chors : s.chors === null ? null : clamp(s.chors, 1, 11, cur.chors),
        loot: clamp(s.loot ?? cur.loot, 3, 15, cur.loot),
        headStart: clamp(s.headStart ?? cur.headStart, 0, 120, cur.headStart),
      };
      broadcastLobby(room);
    });

    socket.on('game:start', (_d, ack) => {
      const { room, p } = ctxOf(socket);
      const reply = (r) => ack && ack(r);
      if (!room || !p) return reply({ ok: false, msg: 'Room nahi mila' });
      if (room.hostId !== p.id) return reply({ ok: false, msg: 'Sirf host game shuru kar sakta hai' });
      if (room.phase !== 'lobby') return reply({ ok: false, msg: 'Game already chalu hai' });
      if ([...room.players.values()].filter((x) => x.connected).length < 2) return reply({ ok: false, msg: 'Kam se kam 2 players chahiye' });
      if (!fresh(p)) return reply({ ok: false, msg: 'Tumhara GPS signal nahi aa raha — khule mein aao' });
      if (p.pos.acc > cfg.MAX_ACC * 1.5) return reply({ ok: false, msg: `GPS weak hai (±${Math.round(p.pos.acc)}m). Thoda ruko ya khule mein aao` });
      startGame(room);
      reply({ ok: true });
    });

    socket.on('game:reset', () => {
      const { room, p } = ctxOf(socket);
      if (!room || !p || room.hostId !== p.id || room.phase !== 'over') return;
      for (const x of [...room.players.values()]) {
        if (!x.connected) removePlayer(room, x);
        else {
          x.role = null;
          x.status = 'free';
          x.jail = null;
          x.immuneUntil = 0;
          x.outside = false;
          x.stats = { arrests: 0, frees: 0, loot: 0 };
        }
      }
      room.phase = 'lobby';
      room.center = null;
      room.loot = [];
      room.result = null;
      broadcastLobby(room);
    });

    socket.on('loc', (d) => {
      const { room, p } = ctxOf(socket);
      if (!room || !p || !d || !Number.isFinite(d.lat) || !Number.isFinite(d.lon)) return;
      if (Math.abs(d.lat) > 90 || Math.abs(d.lon) > 180) return;
      p.pos = { lat: d.lat, lon: d.lon, acc: Number.isFinite(d.acc) ? Math.max(0, d.acc) : 50, ts: now() };
      p.lastSeen = now();
    });

    socket.on('arrest', (_d, ack) => {
      const { room, p } = ctxOf(socket);
      const reply = (r) => ack && ack(r);
      if (!room || !p || room.phase !== 'playing') return reply({ ok: false, msg: 'Abhi arrest nahi kar sakte' });
      if (p.role !== 'police') return reply({ ok: false, msg: 'Sirf police arrest kar sakti hai' });
      if (!fresh(p)) return reply({ ok: false, msg: 'GPS signal nahi hai' });
      if (p.pos.acc > cfg.MAX_ACC) return reply({ ok: false, msg: `Tumhara GPS weak hai (±${Math.round(p.pos.acc)}m). Khule mein aao` });
      let best = null;
      let bestD = Infinity;
      let sawImmune = false;
      for (const c of room.players.values()) {
        if (c.role !== 'chor' || c.status !== 'free' || !fresh(c)) continue;
        const d = dist(p.pos, c.pos);
        if (d > cfg.ARREST_RANGE) continue;
        if (now() < c.immuneUntil) {
          sawImmune = true;
          continue;
        }
        if (c.pos.acc > cfg.MAX_ACC * 1.5) continue;
        if (d < bestD) {
          best = c;
          bestD = d;
        }
      }
      if (!best) {
        return reply({ ok: false, msg: sawImmune ? 'Chor abhi immune hai (jail se abhi nikla)' : `Koi chor ${cfg.ARREST_RANGE}m ke andar nahi hai` });
      }
      best.status = 'jailed';
      best.jail = { lat: best.pos.lat, lon: best.pos.lon };
      p.stats.arrests++;
      toPlayer(best, { type: 'bad', haptic: 'error', msg: `🚔 ${p.name} ne tumhe pakad liya! Dost ka intezaar karo.` });
      toAll(room, { type: 'info', haptic: 'success', msg: `🚔 ${p.name} ne ${best.name} ko pakda!` }, (x) => x.id !== best.id);
      reply({ ok: true, msg: `${best.name} pakda gaya! 🚔` });
      checkEnd(room);
      sendViews(room);
    });

    socket.on('free', (_d, ack) => {
      const { room, p } = ctxOf(socket);
      const reply = (r) => ack && ack(r);
      if (!room || !p || room.phase !== 'playing') return reply({ ok: false, msg: 'Abhi chhuda nahi sakte' });
      if (p.role !== 'chor' || p.status !== 'free') return reply({ ok: false, msg: 'Sirf azaad chor dost ko chhuda sakta hai' });
      if (!fresh(p)) return reply({ ok: false, msg: 'GPS signal nahi hai' });
      if (p.pos.acc > cfg.MAX_ACC) return reply({ ok: false, msg: `Tumhara GPS weak hai (±${Math.round(p.pos.acc)}m)` });
      let best = null;
      let bestD = Infinity;
      for (const c of room.players.values()) {
        if (c.role !== 'chor' || c.status !== 'jailed' || !c.jail) continue;
        const d = dist(p.pos, c.jail);
        if (d <= cfg.FREE_RANGE && d < bestD) {
          best = c;
          bestD = d;
        }
      }
      if (!best) return reply({ ok: false, msg: `Jail ${cfg.FREE_RANGE}m ke andar nahi hai` });
      best.status = 'free';
      best.jail = null;
      best.immuneUntil = now() + cfg.IMMUNITY_MS;
      p.stats.frees++;
      toPlayer(best, { type: 'good', haptic: 'success', msg: `🔓 ${p.name} ne tumhe chhuda liya! ${Math.round(cfg.IMMUNITY_MS / 1000)}s bhaag lo!` });
      toAll(room, { type: 'info', msg: `🔓 ${p.name} ne ${best.name} ko jail se chhuda liya!` }, (x) => x.id !== best.id);
      reply({ ok: true, msg: `${best.name} azaad! 🔓` });
      sendViews(room);
    });

    socket.on('ability:use', (_d, ack) => {
      const reply = (r) => ack && ack(r);
      const { room, p } = ctxOf(socket);
      if (!room || !p) return reply({ ok: false, msg: 'Room nahi mila' });
      if (room.phase !== 'playing') return reply({ ok: false, msg: 'Game chalu hone par hi ability chalegi' });
      if (p.status !== 'free') return reply({ ok: false, msg: 'Jail mein ability nahi chalti' });
      const t = now();
      if ((p.abilityCooldownUntil || 0) > t) {
        const left = Math.ceil((p.abilityCooldownUntil - t) / 1000);
        return reply({ ok: false, msg: `Ability cooldown: ${left}s ruko` });
      }

      p.abilityCooldownUntil = t + 60000;
      if (p.role === 'chor') {
        p.stealthUntil = t + 8000;
        toPlayer(p, { type: 'good', haptic: 'heavy', msg: '💨 Dhuaan activate! 8s tak radar se gayab ho!' });
        toAll(room, { type: 'warn', msg: `💨 ${p.name} ne dhuaan uda diya! Radar se gayab!` }, (x) => x.id !== p.id);
        reply({ ok: true, msg: 'Dhuaan ON! 8s gayab 💨' });
      } else {
        p.boostUntil = t + 8000;
        toPlayer(p, { type: 'good', haptic: 'heavy', msg: '📡 Radar Boost ON! Range 35m ho gayi (8s)!' });
        toAll(room, { type: 'info', msg: `📡 ${p.name} ne Radar Booster activate kiya!` }, (x) => x.id !== p.id);
        reply({ ok: true, msg: 'Radar Boost ON! 📡' });
      }
      sendViews(room);
    });

    socket.on('room:leave', leaveCurrent);

    socket.on('disconnect', () => {
      const { room, p } = ctxOf(socket);
      bySocket.delete(socket.id);
      if (!room || !p || p.socketId !== socket.id) return;
      p.connected = false;
      p.disconnectedAt = now();
      broadcastLobby(room);
    });
  });

  return {
    io,
    httpServer,
    rooms,
    cfg,
    listen: (port) => new Promise((res) => httpServer.listen(port, () => res(httpServer.address().port))),
    close: () => {
      for (const r of rooms.values()) clearInterval(r.timer);
      return new Promise((res) => io.close(() => res()));
    },
  };
}

module.exports = { createServer, DEFAULTS, getLocalIps };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const s = createServer();
  s.listen(port).then(async (p) => {
    const ips = getLocalIps();
    console.log('\n======================================================');
    console.log('  🚓 CHOR-POLICE LIVE REALTIME GAME SERVER');
    console.log('======================================================');
    console.log('  Status    : ONLINE');
    console.log(`  Localhost : http://localhost:${p}`);
    ips.forEach((ip) => {
      console.log(`  Wi-Fi/LAN : http://${ip.address}:${p}  (${ip.name})`);
    });
    console.log('------------------------------------------------------');
    if (ips.length > 0) {
      try {
        const qr = await QRCode.toString(`http://${ips[0].address}:${p}`, { type: 'terminal', small: true });
        console.log('  Scan this QR with phone to connect:');
        console.log(qr);
      } catch {}
    }
    console.log('======================================================\n');
  });
}
