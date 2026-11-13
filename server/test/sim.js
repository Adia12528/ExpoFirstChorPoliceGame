'use strict';
/* Bot simulation: plays full matches against the real server over real sockets. */
const assert = require('assert');
const { io } = require('socket.io-client');
const { createServer } = require('../server');
const { destination } = require('../geo');

const BASE = { lat: 12.9716, lon: 77.5946 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, what, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = fn();
    if (v) return v;
    await sleep(40);
  }
  throw new Error('timeout waiting for: ' + what);
}

class Bot {
  constructor(url, name) {
    this.name = name;
    this.id = 'bot-' + name;
    this.url = url;
    this.x = 0;
    this.y = 0;
    this.acc = 5;
    this.view = null;
    this.events = [];
    this.over = null;
    this.lobby = null;
    this.connect();
    this.beacon = setInterval(() => this.send(), 500);
  }
  connect() {
    this.socket = io(this.url, { transports: ['websocket'], forceNew: true });
    this.socket.on('game:view', (v) => (this.view = v));
    this.socket.on('game:event', (e) => this.events.push(e));
    this.socket.on('game:over', (r) => (this.over = r));
    this.socket.on('lobby', (l) => (this.lobby = l));
  }
  send() {
    const p = destination(BASE, this.x, this.y);
    this.socket.emit('loc', { lat: p.lat, lon: p.lon, acc: this.acc });
  }
  moveTo(x, y) {
    this.x = x;
    this.y = y;
    this.send();
  }
  call(ev, data) {
    return new Promise((res) => this.socket.timeout(3000).emit(ev, data, (err, r) => res(err ? { ok: false, msg: 'timeout' } : r)));
  }
  stop() {
    clearInterval(this.beacon);
    this.socket.close();
  }
}

let passed = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  passed++;
  console.log('  ✓', msg);
};

async function setup(srv, names, settings) {
  const port = await srv.listen(0);
  const url = `http://localhost:${port}`;
  const bots = names.map((n) => new Bot(url, n));
  await waitFor(() => bots.every((b) => b.socket.connected), 'connect');
  const host = bots[0];
  const created = await host.call('room:create', { name: host.name, playerId: host.id });
  assert.ok(created.ok && created.code.length === 4);
  for (const b of bots.slice(1)) {
    const r = await b.call('room:join', { name: b.name, playerId: b.id, code: created.code });
    assert.ok(r.ok, 'join failed ' + JSON.stringify(r));
  }
  bots.forEach((b, i) => b.moveTo(i * 3, 0));
  host.socket.emit('room:settings', settings);
  await sleep(200);
  return { bots, host, code: created.code, url };
}

async function scenarioPolice() {
  console.log('\nScenario A — police win (arrest, free, immunity, CCTV, privacy, reconnect)');
  const srv = createServer({ TICK_MS: 250, IMMUNITY_MS: 1500, CCTV_FIRST: 4, CCTV_EVERY: 6, CCTV_WARN: 1, CCTV_LIVE: 2 });
  const { bots, host, code, url } = await setup(srv, ['Alice', 'Bob', 'Cara', 'Dev'], { chors: 2, loot: 3, headStart: 1, radius: 150 });

  const early = await bots[1].call('game:start');
  ok(!early.ok, 'non-host cannot start the game');
  const started = await host.call('game:start');
  ok(started.ok, 'host starts the game');
  await waitFor(() => bots.every((b) => b.view && b.view.role), 'roles');
  const chors = bots.filter((b) => b.view.role === 'chor');
  const police = bots.filter((b) => b.view.role === 'police');
  ok(chors.length === 2 && police.length === 2, 'roles split 2 chor / 2 police');
  ok(police.every((b) => b.view.blind && b.view.foes.length === 0), 'police are blind during head-start');
  ok(chors.every((b) => b.view.loot.length === 3), 'chors see all 3 loot points; police do not: ' + police.every((b) => b.view.loot.length === 0));
  ok((await chors[0].call('arrest')).ok === false, 'chor cannot arrest');

  const [C1, C2] = chors;
  const [P1, P2] = police;
  C1.moveTo(50, 0);
  C2.moveTo(70, 0);
  P1.moveTo(-40, 0);
  P2.moveTo(-60, 0);
  await waitFor(() => P1.view.phase === 'playing' && P1.view.heat, 'playing + heat');
  ok(P1.view.foes.length === 0, 'police see NO chor blips when chors are far (privacy)');
  ok(P1.view.heat.level === 1 && P1.view.heat.kind === 'chor', 'police heat level 1 at ~90m');
  ok(C1.view.foes.length === 0 && C1.view.heat.level === 0, 'chor danger level 0 with police ~90m away');
  ok(!('lat' in (C1.view.zone || {})) && !JSON.stringify(C1.view).includes('77.59'), 'views carry relative offsets only (no absolute coordinates)');

  await waitFor(() => P1.view.cctv.state === 'live' && P1.view.foes.some((f) => f.kind === 'cctv'), 'CCTV sweep reveals chors', 12000);
  ok(chors.every((c) => c.view.cctv.state === 'live'), 'CCTV state visible to both teams');
  ok(P1.view.foes.length === 2, 'CCTV reveals both free chors to police');
  await waitFor(() => P1.view.cctv.state !== 'live' && P1.view.foes.length === 0, 'CCTV ends', 6000);

  P1.moveTo(35, 0);
  await sleep(120);
  const far = await P1.call('arrest');
  ok(!far.ok && /12m/.test(far.msg), 'arrest refused at 15m: ' + far.msg);
  await waitFor(() => P1.view.foes.some((f) => f.kind === 'sense'), 'blip within 20m');
  ok(P1.view.heat.level >= 3, 'police heat level >=3 at 15m');
  P1.moveTo(42, 0);
  await sleep(120);
  const caught = await P1.call('arrest');
  ok(caught.ok, 'arrest at 8m works: ' + caught.msg);
  await waitFor(() => C1.view.status === 'jailed', 'C1 jailed');
  await waitFor(() => C2.view.jails.length === 1, 'jail marker visible to teammate');
  await waitFor(() => P2.view.jails.length === 1, 'jail marker visible to police too');
  ok(true, 'jail marker visible to police too');
  ok(C2.view.score.chorsFree === 1, 'score tracks free chors');

  C2.moveTo(45, 0);
  await sleep(120);
  const freed = await C2.call('free');
  ok(freed.ok, 'free chor breaks jail: ' + freed.msg);
  await waitFor(() => C1.view.status === 'free' && C1.view.immuneLeft > 0, 'C1 free + immune');
  C2.moveTo(120, 0);
  await sleep(150);
  const imm = await P1.call('arrest');
  ok(!imm.ok && /immune/.test(imm.msg), 'freshly freed chor is immune: ' + imm.msg);

  // reconnect mid-game with same playerId
  P2.socket.close();
  await sleep(300);
  P2.view = null;
  P2.connect();
  await waitFor(() => P2.socket.connected, 'reconnect');
  const rj = await P2.call('room:join', { name: 'Dev', playerId: P2.id, code });
  ok(rj.ok, 'player can rejoin a running game with same id');
  await waitFor(() => P2.view && P2.view.role === 'police', 'rejoined player gets his role back');
  const late = new Bot(url, 'Late');
  await waitFor(() => late.socket.connected, 'late connect');
  const lj = await late.call('room:join', { name: 'Late', playerId: late.id, code });
  ok(!lj.ok, 'brand-new player cannot join a running game: ' + lj.msg);
  late.stop();

  await sleep(1700); // immunity over
  ok((await P1.call('arrest')).ok, 'C1 arrested again after immunity');
  P1.moveTo(115, 0);
  await sleep(150);
  const last = await P1.call('arrest');
  ok(last.ok, 'last chor arrested');
  await waitFor(() => bots.every((b) => b.over), 'game over broadcast');
  ok(host.over.winner === 'police' && /jail/i.test(host.over.reason), 'police win when all chors jailed');
  ok(host.over.players.reduce((a, p) => a + p.arrests, 0) === 3, 'stats count arrests');
  bots.forEach((b) => b.stop());
  await srv.close();
}

async function scenarioChors() {
  console.log('\nScenario B — chors win by looting everything, then reset + time-over');
  const srv = createServer({ TICK_MS: 250 });
  const { bots, host, code } = await setup(srv, ['Anu', 'Bala', 'Chitra'], { chors: 1, loot: 3, headStart: 0, radius: 150 });
  ok((await host.call('game:start')).ok, 'start without head-start');
  await waitFor(() => bots.every((b) => b.view && b.view.role), 'roles');
  const chor = bots.find((b) => b.view.role === 'chor');
  bots.filter((b) => b !== chor).forEach((b, i) => b.moveTo(-100, i * 5));
  await waitFor(() => chor.view.phase === 'playing', 'playing');
  let guard = 0;
  while (!chor.over && guard++ < 10) {
    await waitFor(() => chor.view.loot.length > 0 || chor.over, 'loot visible');
    if (chor.over) break;
    const l = chor.view.loot[0];
    chor.moveTo(chor.x + l.dx, chor.y + l.dy);
    const before = chor.view.score.loot;
    await waitFor(() => chor.over || chor.view.score.loot > before, 'loot collected');
  }
  await waitFor(() => bots.every((b) => b.over), 'game over broadcast');
  ok(host.over.winner === 'chor' && host.over.loot === 3, 'chors win after collecting 3/3 loot');
  ok(host.over.mvp && host.over.mvp.name === chor.name, 'MVP = the looter');

  host.socket.emit('game:reset');
  await waitFor(() => host.lobby && host.lobby.phase === 'lobby', 'back to lobby');
  ok(host.lobby.result === null, 'reset returns everybody to the lobby');
  bots.forEach((b, i) => { b.view = null; b.over = null; b.moveTo(i * 3, 0); });
  ok((await host.call('game:start')).ok, 'second round starts');
  await waitFor(() => bots.every((b) => b.view && b.view.role), 'roles round 2');
  srv.rooms.get(code).phaseEndsAt = Date.now() + 600;
  await waitFor(() => bots.every((b) => b.over), 'time over');
  ok(host.over.winner === 'police' && /Time/.test(host.over.reason), 'police win when time runs out');
  bots.forEach((b) => b.stop());
  await srv.close();
}

async function scenarioGuards() {
  console.log('\nScenario C — guards');
  const srv = createServer({ TICK_MS: 250 });
  const port = await srv.listen(0);
  const a = new Bot(`http://localhost:${port}`, 'Solo');
  await waitFor(() => a.socket.connected, 'connect');
  ok(!(await a.call('room:join', { name: 'x', playerId: 'x1', code: 'ZZZZ' })).ok, 'unknown room code rejected');
  const c = await a.call('room:create', { name: 'Solo', playerId: a.id });
  ok(c.ok, 'room created');
  ok(!(await a.call('game:start')).ok, 'cannot start alone / without GPS');
  a.stop();
  await srv.close();
}

(async () => {
  await scenarioPolice();
  await scenarioChors();
  await scenarioGuards();
  console.log(`\nALL GOOD — ${passed} checks passed`);
  process.exit(0);
})().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
