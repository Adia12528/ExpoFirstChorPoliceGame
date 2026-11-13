import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path } from 'react-native-svg';
import { C, oppositeColor, teamColor } from '../theme';
import type { GameView } from '../types';

function PulseDot({ color, size = 14, pulse = true }: { color: string; size?: number; pulse?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [a, pulse]);
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {pulse && (
        <Animated.View
          style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, transform: [{ scale }] }}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 2, borderColor: '#0009' }} />
    </View>
  );
}

function Marker({ x, y, label, dim, children }: { x: number; y: number; label?: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <View pointerEvents="none" style={[s.marker, { left: x - 30, top: y - 14, opacity: dim ? 0.65 : 1 }]}>
      {children}
      {label ? (
        <Text numberOfLines={1} style={s.label}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function Radar({
  size,
  range,
  view,
  role,
  actionRange,
  heading = 0,
}: {
  size: number;
  range: number;
  view: GameView;
  role: 'chor' | 'police';
  actionRange: number;
  heading?: number;
}) {
  const c = size / 2;
  const rim = c - 6;
  const k = rim / range;
  const me = teamColor(role);
  const foe = oppositeColor(role);

  const rad = -(heading * Math.PI) / 180;
  const cosH = Math.cos(rad);
  const sinH = Math.sin(rad);

  const rotCoords = (dx: number, dy: number) => ({
    rx: dx * cosH - dy * sinH,
    ry: dx * sinH + dy * cosH,
  });

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const pos = (dx: number, dy: number) => {
    const r = rotCoords(dx, dy);
    let x = r.rx * k;
    let y = -r.ry * k;
    const m = Math.hypot(x, y);
    let clipped = false;
    if (m > rim - 8) {
      x = (x / m) * (rim - 8);
      y = (y / m) * (rim - 8);
      clipped = true;
    }
    return { x: c + x, y: c + y, clipped, meters: Math.hypot(dx, dy) };
  };

  const a = (-50 * Math.PI) / 180;
  const wedge = `M ${c} ${c} L ${c} ${c - rim} A ${rim} ${rim} 0 0 0 ${c + rim * Math.sin(a)} ${c - rim * Math.cos(a)} Z`;

  const north = rotCoords(0, range);
  const northPos = {
    x: c + (north.rx / range) * (rim - 14),
    y: c - (north.ry / range) * (rim - 14),
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id="disc">
            <Circle cx={c} cy={c} r={rim} />
          </ClipPath>
        </Defs>
        <Circle cx={c} cy={c} r={rim} fill="#0C1426" stroke={C.line} strokeWidth={2} />
        {[1, 2, 3].map((i) => (
          <Circle key={i} cx={c} cy={c} r={(rim * i) / 3} fill="none" stroke={C.line} strokeWidth={1} />
        ))}
        <Line x1={c} y1={c - rim} x2={c} y2={c + rim} stroke={C.line} strokeWidth={1} />
        <Line x1={c - rim} y1={c} x2={c + rim} y2={c} stroke={C.line} strokeWidth={1} />
        <G clipPath="url(#disc)">
          {view.zone && (() => {
            const z = rotCoords(view.zone.dx, view.zone.dy);
            return (
              <Circle
                cx={c + z.rx * k}
                cy={c - z.ry * k}
                r={view.zone.r * k}
                fill="none"
                stroke={C.warn}
                strokeWidth={2.5}
                strokeDasharray="5 6"
                opacity={0.9}
              />
            );
          })()}
          <Circle cx={c} cy={c} r={Math.max(actionRange * k, 4)} fill={me} fillOpacity={0.1} stroke={me} strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray="3 4" />
        </G>
      </Svg>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: rot }] }]}>
        <Svg width={size} height={size}>
          <Path d={wedge} fill={me} fillOpacity={0.14} />
          <Line x1={c} y1={c} x2={c} y2={c - rim} stroke={me} strokeOpacity={0.7} strokeWidth={1.5} />
        </Svg>
      </Animated.View>

      {[1, 2, 3].map((i) => (
        <Text key={i} style={[s.ring, { top: c + 3, left: c + (rim * i) / 3 - 22 }]}>
          {Math.round((range * i) / 3)}m
        </Text>
      ))}
      <Text style={[s.north, { left: northPos.x - 7, top: northPos.y - 7 }]}>N</Text>

      {/* me */}
      <Marker x={c} y={c}>
        <PulseDot color={me} size={16} />
      </Marker>

      {/* loot (chor only) */}
      {view.loot.map((l) => {
        const p = pos(l.dx, l.dy);
        return (
          <Marker key={`l${l.id}`} x={p.x} y={p.y} dim={p.clipped} label={p.clipped ? `${Math.round(p.meters)}m` : undefined}>
            <Text style={{ fontSize: 20 }}>💰</Text>
          </Marker>
        );
      })}

      {/* jail markers */}
      {view.jails.map((j) => {
        const p = pos(j.dx, j.dy);
        return (
          <Marker key={`j${j.id}`} x={p.x} y={p.y} dim={p.clipped} label={j.name}>
            <Text style={{ fontSize: 20 }}>🔒</Text>
          </Marker>
        );
      })}

      {/* teammates */}
      {view.allies.map((al) => {
        const p = pos(al.dx, al.dy);
        return (
          <Marker key={`a${al.id}`} x={p.x} y={p.y} dim={p.clipped} label={al.name}>
            <PulseDot color={me} size={12} pulse={false} />
          </Marker>
        );
      })}

      {/* opponents */}
      {view.foes.map((f) => {
        const p = pos(f.dx, f.dy);
        if (f.kind === 'sense') {
          return (
            <Marker key={`f${f.id}`} x={p.x} y={p.y} dim={p.clipped} label={f.name}>
              <PulseDot color={foe} size={14} />
            </Marker>
          );
        }
        return (
          <Marker key={`f${f.id}`} x={p.x} y={p.y} dim={p.clipped} label={`${f.kind === 'cctv' ? '📹 ' : '📍 '}${f.name}`}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: foe, borderStyle: f.kind === 'zone' ? 'dashed' : 'solid' }} />
          </Marker>
        );
      })}

    </View>
  );
}

const s = StyleSheet.create({
  marker: { position: 'absolute', width: 60, height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', top: 27, left: -10, width: 80, textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.text },
  ring: { position: 'absolute', fontSize: 9, color: C.dim, fontWeight: '600' },
  north: { position: 'absolute', fontSize: 12, fontWeight: '900', color: C.dim },
});
