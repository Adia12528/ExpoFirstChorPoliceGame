import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';
import { buzz } from '../haptics';

export function RoleRevealModal({
  role,
  visible,
  onFinish,
}: {
  role: 'chor' | 'police' | null;
  visible: boolean;
  onFinish: () => void;
}) {
  const isChor = role === 'chor';
  const color = isChor ? C.chor : C.police;

  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bannerScale = useRef(new Animated.Value(0.8)).current;
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!visible || !role) return;

    buzz('heavy');
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(bannerScale, {
        toValue: 1,
        friction: 4,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();

    // 3 second countdown before launching into game
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(onFinish, 300);
          return 0;
        }
        buzz('countdown');
        return prev - 1;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [visible, role, onFinish, scaleAnim, opacityAnim, bannerScale]);

  if (!visible || !role) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <Animated.View
          style={[
            s.card,
            {
              borderColor: color,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
              shadowColor: color,
            },
          ]}
        >
          <Text style={s.kicker}>TUMHARA MISSION</Text>

          <Text style={s.emoji}>{isChor ? '😈' : '👮‍♂️'}</Text>

          <Animated.View style={[s.badge, { backgroundColor: color, transform: [{ scale: bannerScale }] }]}>
            <Text style={s.roleText}>{isChor ? 'TUM CHOR HO!' : 'TUM POLICE HO!'}</Text>
          </Animated.View>

          <Text style={s.desc}>
            {isChor
              ? '💰 Zone mein bikhra maal churao aur police ke radar se bacho! Dost jail mein ho to chhuda lena!'
              : '🚨 Saare chors ko pakad kar jail mein daalo aur time khatam hone tak maal bachao!'}
          </Text>

          <View style={s.countdownBox}>
            <Text style={s.countdownText}>Game shuru hone mein: {countdown}s</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000E6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 3,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 20,
  },
  kicker: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 72,
    marginVertical: 4,
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 14,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  desc: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginVertical: 10,
  },
  countdownBox: {
    marginTop: 18,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  countdownText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
