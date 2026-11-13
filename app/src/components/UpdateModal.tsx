import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { Btn, Card } from './UI';
import { downloadAndInstallApk, UpdateInfo } from '../updater';
import { C } from '../theme';

export function UpdateModal({
  update,
  onDismiss,
}: {
  update: UpdateInfo | null;
  onDismiss: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  if (!update || !update.hasUpdate) return null;

  const handleUpdate = async () => {
    setDownloading(true);
    setProgress(0);
    setStatusMsg('Naya update download ho raha hai…');

    const res = await downloadAndInstallApk(update.downloadUrl, (pct) => {
      setProgress(pct);
    });

    setDownloading(false);
    if (res.ok) {
      setStatusMsg('✓ Installer launch ho gaya!');
      setTimeout(() => onDismiss(), 2500);
    } else {
      setStatusMsg(res.msg || 'Update install nahi ho paya.');
    }
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

          {downloading ? (
            <View style={{ gap: 10, marginVertical: 12 }}>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={s.progressText}>
                {progress > 0 ? `Downloading: ${progress}%` : 'Starting download…'}
              </Text>
            </View>
          ) : null}

          {statusMsg ? <Text style={s.statusMsg}>{statusMsg}</Text> : null}

          {!downloading ? (
            <View style={{ gap: 8, marginTop: 14 }}>
              <Btn title="📲 Abhi Update Karein" color={C.chor} onPress={handleUpdate} />
              <Btn small ghost color={C.dim} title="Baad mein (Later)" onPress={onDismiss} />
            </View>
          ) : null}
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
  progressBarBg: {
    height: 10,
    backgroundColor: '#374151',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: C.chor,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  statusMsg: {
    fontSize: 13,
    color: C.ok,
    textAlign: 'center',
    marginTop: 8,
  },
});
