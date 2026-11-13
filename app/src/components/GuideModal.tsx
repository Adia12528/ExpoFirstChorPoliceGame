import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, Card } from './UI';
import { GAME_GUIDE } from '../constants';
import { C } from '../theme';

export function GuideButton({ label = '📖 Game Kaise Khelte Hain? (Guide)' }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Btn
        small
        ghost
        color={C.chor}
        title={label}
        onPress={() => setOpen(true)}
      />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.header}>
              <View>
                <Text style={s.title}>📖 Khelne Ka Tareeqa</Text>
                <Text style={s.subtitle}>Chor-Police LIVE Master Guide</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
              {GAME_GUIDE.map((section, idx) => (
                <Card key={idx} style={s.sectionCard}>
                  <Text style={s.sectionTitle}>
                    {section.emoji} {section.title}
                  </Text>
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {section.points.map((pt, pIdx) => (
                      <View key={pIdx} style={s.pointRow}>
                        <Text style={s.bullet}>•</Text>
                        <Text style={s.pointText}>{pt}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              ))}

              <View style={{ marginTop: 10, marginBottom: 20 }}>
                <Btn title="Samajh Gaya 👍" color={C.chor} onPress={() => setOpen(false)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0F1626',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    paddingVertical: 14,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#131D31',
    borderColor: '#24324D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    color: C.chor,
    fontSize: 16,
    lineHeight: 20,
  },
  pointText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
});

