import { router } from 'expo-router';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlants } from '../state/PlantProvider';
import { dateLabel } from '../ui/date';
import { strings } from '../ui/strings';
import { palette } from '../ui/theme';

export default function HistoryScreen() {
  const { waterings, language } = usePlants();
  const { bottom } = useSafeAreaInsets();
  const s = strings[language];
  // Keep the list above Android navigation buttons even when the reported inset is zero.
  const bottomClearance = Platform.OS === 'android' ? Math.max(bottom, 48) : bottom;

  function close() {
    if (router.canDismiss()) router.back();
    else router.replace('/');
  }

  return <SafeAreaView edges={['top']} style={styles.safeArea}>
    <View style={styles.heading}>
      <Text style={styles.title}>{s.history}</Text>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={language === 'ru' ? 'Закрыть' : 'Close'}>
        <Image source={require('../../assets/images/close.png')} style={styles.closeIcon} />
      </Pressable>
    </View>
    <View style={[styles.body, { paddingBottom: bottomClearance }]}>
      <FlatList data={waterings} keyExtractor={item => item.id} style={styles.list}
        contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyHint}>{s.noHistory}</Text>}
        renderItem={({ item }) => <View style={styles.historyRow}>
          <Text style={styles.historyEmoji}>{item.icon}</Text>
          <Text style={styles.historyName}>{item.plantName}</Text>
          <Text style={styles.historyDate}>{dateLabel(item.date, language)}</Text>
        </View>} />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.surface },
  heading: { minHeight: 64, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: palette.border },
  title: { color: palette.ink, fontSize: 22, fontWeight: '800' },
  closeIcon: { width: 30, height: 30 },
  body: { flex: 1, backgroundColor: palette.canvas },
  list: { flex: 1 }, listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  emptyHint: { color: palette.muted, textAlign: 'center', lineHeight: 21 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 14, marginBottom: 8 },
  historyEmoji: { fontSize: 25 }, historyName: { flex: 1, color: palette.ink, fontWeight: '700' }, historyDate: { color: palette.muted, fontSize: 12 },
});
