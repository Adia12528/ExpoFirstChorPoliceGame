import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path } from 'react-native-svg';
import { C, oppositeColor, teamColor } from '../theme';
import type { GameView } from '../types';

function PulseDot({ color, size = 14, pulse = true }: { color: string; size?: number; pulse?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [a, pulse]);

  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.7] });
  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {pulse && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity,
            transform: [{ scale }],
          }}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: '#000000AA',
        }}
      />
    </View>
  );
}

/**
 * 60 FPS Interpolated Marker
 * Smoothly animates position changes between 1-second server GPS updates
 * using native animated drivers so blips don't jump abruptly.
 */
function SmoothMarker({
  targetX,
  targetY,
  label,
  dim,
  children,
}: {
  targetX: number;
  targetY: number;
  label?: string;
  dim?: boolean;
  children: React.ReactNode;
}) {
  const animX = useRef(new Animated.Value(targetX)).current;
  const animY = useRef(new Animated.Value(targetY)).current;

  useEffect(() => {
    // 600ms smooth spring/ease transition towards the next target position
    Animated.parallel([
      Animated.timing(animX, {
        toValue: targetX,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(animY, {
        toValue: targetY,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [targetX, targetY, animX, animY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.marker,
        {
          opacity: dim ? 0.65 : 1,
          transform: [
            { translateX: Animated.subtract(animX, 30) },
            { translateY: Animated.subtract(animY, 14) },
          ],
        },
      ]}
    >
      {children}
      {label ? (
        <Text numberOfLines={1} style={s.label}>
          {label}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function StaticMarker({ x, y, label, dim, children }: { x: number; y: number; label?: string; dim?: boolean; children: React.ReactNode }) {
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

export const Radar = memo(function Radar({
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

  // Smooth compass rotation using Animated Value
  const animHeading = useRef(new Animated.Value(heading)).current;
  useEffect(() => {
    Animated.timing(animHeading, {
      toValue: heading,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [heading, animHeading]);

  const rad = -(heading * Math.PI) / 180;
  const cosH = Math.cos(rad);
  const sinH = Math.sin(rad);

  const rotCoords = (dx: number, dy: number) => ({
    rx: dx * cosH - dy * sinH,
    ry: dx * sinH + dy * cosH,
  });

  // Continuous 60fps Radar sweeping line
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
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

  const a = (-45 * Math.PI) / 180;
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

        {/* Tactical Dark Radar Background */}
        <Circle cx={c} cy={c} r={rim} fill="#090E1D" stroke={C.line} strokeWidth={2} />

        {/* Concentric Distance Rings */}
        {[1, 2, 3].map((i) => (
          <Circle
            key={i}
            cx={c}
            cy={c}
            r={(rim * i) / 3}
            fill="none"
            stroke={C.line}
            strokeWidth={1}
            strokeDasharray={i === 3 ? undefined : '3 4'}
          />
        ))}

        {/* Grid Crosshairs */}
        <Line x1={c} y1={c - rim} x2={c} y2={c + rim} stroke={C.line} strokeWidth={1} />
        <Line x1={c - rim} y1={c} x2={c + rim} y2={c} stroke={C.line} strokeWidth={1} />

        <G clipPath="url(#disc)">
          {/* Game Zone Boundary */}
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

          {/* Action Range Circle (Catch / Free radius around player) */}
          <Circle
            cx={c}
            cy={c}
            r={Math.max(actionRange * k, 4)}
            fill={me}
            fillOpacity={0.12}
            stroke={me}
            strokeOpacity={0.65}
            strokeWidth={1.5}
            strokeDasharray="3 4"
          />
        </G>
      </Svg>

      {/* Sweeping Radar Scanner Line */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: rot }] }]}>
        <Svg width={size} height={size}>
          <Path d={wedge} fill={me} fillOpacity={0.15} />
          <Line x1={c} y1={c} x2={c} y2={c - rim} stroke={me} strokeOpacity={0.8} strokeWidth={1.8} />
        </Svg>
      </Animated.View>

      {/* Range Labels */}
      {[1, 2, 3].map((i) => (
        <Text key={i} style={[s.ring, { top: c + 3, left: c + (rim * i) / 3 - 22 }]}>
          {Math.round((range * i) / 3)}m
        </Text>
      ))}

      {/* North Cardinal Indicator */}
      <Text style={[s.north, { left: northPos.x - 7, top: northPos.y - 7 }]}>N</Text>

      {/* Player Self Marker at Center */}
      <StaticMarker x={c} y={c}>
        <PulseDot color={me} size={16} />
      </StaticMarker>

      {/* Loot Points (Chor only) */}
      {view.loot.map((l) => {
        const p = pos(l.dx, l.dy);
        return (
          <SmoothMarker key={`l${l.id}`} targetX={p.x} targetY={p.y} dim={p.clipped} label={p.clipped ? `${Math.round(p.meters)}m` : undefined}>
            <Text style={{ fontSize: 20 }}>💰</Text>
          </SmoothMarker>
        );
      })}

      {/* Jail Markers */}
      {view.jails.map((j) => {
        const p = pos(j.dx, j.dy);
        return (
          <SmoothMarker key={`j${j.id}`} targetX={p.x} targetY={p.y} dim={p.clipped} label={j.name}>
            <Text style={{ fontSize: 20 }}>🔒</Text>
          </SmoothMarker>
        );
      })}

      {/* Teammates (Allies) with 60 FPS interpolation */}
      {view.allies.map((al) => {
        const p = pos(al.dx, al.dy);
        return (
          <SmoothMarker key={`a${al.id}`} targetX={p.x} targetY={p.y} dim={p.clipped} label={al.name}>
            <PulseDot color={me} size={13} pulse={false} />
          </SmoothMarker>
        );
      })}

      {/* Opponents (Foes) with 60 FPS interpolation */}
      {view.foes.map((f) => {
        const p = pos(f.dx, f.dy);
        if (f.kind === 'sense') {
          return (
            <SmoothMarker key={`f${f.id}`} targetX={p.x} targetY={p.y} dim={p.clipped} label={f.name}>
              <PulseDot color={foe} size={15} />
            </SmoothMarker>
          );
        }
        return (
          <SmoothMarker key={`f${f.id}`} targetX={p.x} targetY={p.y} dim={p.clipped} label={`${f.kind === 'cctv' ? '📹 ' : '📍 '}${f.name}`}>
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: foe,
                borderStyle: f.kind === 'zone' ? 'dashed' : 'solid',
              }}
            />
          </SmoothMarker>
        );
      })}
    </View>
  );
});

const s = StyleSheet.create({
  marker: { position: 'absolute', top: 0, left: 0, width: 60, height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', top: 27, left: -10, width: 80, textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.text },
  ring: { position: 'absolute', fontSize: 9, color: C.dim, fontWeight: '600' },
  north: { position: 'absolute', fontSize: 12, fontWeight: '900', color: C.dim },
});
