import React, { useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { Btn, Card } from './UI';
import { DIRECT_APK_URL, LATEST_RELEASE_URL, UpdateInfo } from '../updater';
import { C } from '../theme';

export function UpdateModal({
  update,
  onDismiss,
}: {
  update: UpdateInfo | null;
  onDismiss: () => void;
}) {
  const [opening, setOpening] = useState(false);

  if (!update || !update.hasUpdate) return null;

  const handleUpdate = async () => {
    setOpening(true);
    try {
      const url = update.downloadUrl || DIRECT_APK_URL;
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(LATEST_RELEASE_URL);
      }
    } catch {
      await Linking.openURL(LATEST_RELEASE_URL);
    }
    setOpening(false);
    onDismiss();
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <Card style={s.card}>
          <View style={s.badge}>
            <Text style={s.badgeText}>🚀 NAYA UPDATE AVAILABLE</Text>
          </View>

          <Text style={s.title}>Chor-Police LIVE Update</Text>
          <Text style={s.versionRow}>
            v{update.currentVersion} ➔ <Text style={{ color: C.chor, fontWeight: '800' }}>v{update.latestVersion}</Text>
          </Text>

          <Text style={s.changelogTitle}>Naya kya hai:</Text>
          <Text style={s.changelogText}>{update.changelog}</Text>

          <View style={{ gap: 8, marginTop: 16 }}>
            <Btn
              title={opening ? 'Download shuru ho raha hai…' : '📥 Direct APK Download Karein'}
              color={C.chor}
              disabled={opening}
              onPress={handleUpdate}
            />
            <Btn
              small
              ghost
              color={C.police}
              title="🌐 GitHub Release Page Kholo"
              onPress={() => {
                Linking.openURL(LATEST_RELEASE_URL);
                onDismiss();
              }}
            />
            <Btn small ghost color={C.dim} title="Baad mein (Later)" onPress={onDismiss} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111827',
    borderColor: '#374151',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 8,
  },
  badgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  versionRow: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 12,
  },
  changelogTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1D5DB',
    marginBottom: 4,
  },
  changelogText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    backgroundColor: '#1F2937',
    padding: 10,
    borderRadius: 10,
  },
});
