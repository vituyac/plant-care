import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { daysUntil, nextWatering, Plant, PLANT_ICONS } from '../domain/plant';
import { usePlants } from '../state/PlantProvider';
import { dateLabel } from '../ui/date';
import { strings } from '../ui/strings';
import { palette } from '../ui/theme';

const ADD_BUTTON_INSET = 16;
const ADD_BUTTON_RADIUS = 14;

export default function HomeScreen() {
  const { plants, language, ready, error, addPlant, editPlant, deletePlant, waterPlant } = usePlants();
  const s = strings[language];
  const [editing, setEditing] = useState<Plant | 'new' | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(PLANT_ICONS[0]);
  const [interval, setInterval] = useState('7');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wateringId, setWateringId] = useState<string | null>(null);
  const wateringRef = useRef<string | null>(null);
  const [wateringProgress] = useState(() => new Animated.Value(0));
  const canOpacity = wateringProgress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] });
  const dropOpacity = wateringProgress.interpolate({ inputRange: [0, 0.3, 0.5, 0.85, 1], outputRange: [0, 0, 1, 1, 0] });
  const dropY = wateringProgress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [-3, -3, 5] });
  const dueCount = plants.filter(plant => daysUntil(nextWatering(plant)) <= 0).length;
  const visible = useMemo(() => [...plants]
    .sort((a, b) => nextWatering(a).localeCompare(nextWatering(b)) || a.name.localeCompare(b.name)), [plants]);

  function openForm(plant?: Plant) {
    setEditing(plant ?? 'new');
    setName(plant?.name ?? '');
    setIcon(plant?.icon ?? PLANT_ICONS[0]);
    setInterval(String(plant?.intervalDays ?? 7));
    setFormError('');
  }

  async function save() {
    const days = Number(interval);
    if (!name.trim()) return setFormError(s.invalidName);
    if (!Number.isInteger(days) || days < 1 || days > 365) return setFormError(s.invalidInterval);
    setBusy(true);
    try {
      if (editing && editing !== 'new') await editPlant(editing.id, name.trim(), icon, days);
      else await addPlant(name.trim(), icon, days);
      setEditing(null);
    } catch { setFormError(s.saveError); }
    finally { setBusy(false); }
  }

  function confirmDelete(plant: Plant) {
    Alert.alert(s.delete, s.deleteAsk, [
      { text: s.cancel, style: 'cancel' },
      { text: s.delete, style: 'destructive', onPress: () => {
        deletePlant(plant.id).then(() => setEditing(null)).catch(() => setFormError(s.saveError));
      } },
    ]);
  }

  function water(id: string) {
    if (wateringRef.current) return;
    wateringRef.current = id;
    setWateringId(id);
    wateringProgress.setValue(0);
    Animated.timing(wateringProgress, { toValue: 1, duration: 650, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) {
        wateringRef.current = null;
        setWateringId(null);
        return;
      }
      void waterPlant(id).catch(() => Alert.alert(s.saveError)).finally(() => {
        wateringRef.current = null;
        setWateringId(null);
      });
    });
  }

  function status(plant: Plant) {
    const remaining = daysUntil(nextWatering(plant));
    if (remaining < 0) return `${s.overdue} ${-remaining} ${s.days}`;
    if (remaining === 0) return s.todayLabel;
    if (remaining === 1) return s.tomorrow;
    return `${remaining} ${s.days}`;
  }

  return <SafeAreaView edges={['top']} style={styles.safeArea}>
    <View style={styles.appBar}>
      <View style={styles.brand}><Image source={require('../../assets/images/brand-mark.png')} style={styles.brandIcon} /></View>
      <Text style={styles.appTitle}>{s.app}</Text>
      <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={s.settings} style={styles.settingsButton}>
        <Image source={require('../../assets/images/settings.png')} style={styles.settingsIcon} />
      </Pressable>
    </View>
    <View style={styles.body}>
    <FlatList data={visible} keyExtractor={item => item.id} style={styles.list}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.summary}><View><Text style={styles.summaryLabel}>{s.today}</Text>
          <Text style={styles.summaryCount}>{dueCount}</Text></View><Text style={styles.summaryArt}>💧</Text></View>
        <View style={styles.headingRow}><Text style={styles.heading}>{s.plants} <Text style={styles.count}>{plants.length}</Text></Text></View>
        {error && <Text style={styles.error}>{s.saveError}</Text>}
      </View>}
      renderItem={({ item, index }) => {
        const due = daysUntil(nextWatering(item)) <= 0;
        return <View style={[styles.card, index === visible.length - 1 && styles.lastCard]}>
          <Pressable onPress={() => openForm(item)} accessibilityRole="button" accessibilityLabel={`${s.edit}: ${item.name}`} style={styles.cardTop}>
            <View style={styles.plantIcon}><Text style={styles.plantEmoji}>{item.icon}</Text></View>
            <View style={styles.cardText}><Text numberOfLines={1} style={styles.plantName}>{item.name}</Text>
              <Text style={styles.cardMeta}>{s.next}: {dateLabel(nextWatering(item), language)}</Text></View>
            <View style={styles.cardArrowSlot}>
              <Image source={require('../../assets/images/arrow-forward.png')} style={styles.cardArrowIcon} />
            </View>
          </Pressable>
          <View style={styles.cardBottom}><View style={[styles.statusPill, due && styles.statusDue]}>
            <Text style={[styles.statusText, due && styles.statusDueText]}>{status(item)}</Text></View>
            {due && <Pressable onPress={() => water(item.id)} disabled={wateringId !== null} style={styles.waterButton} hitSlop={{ top: 7, bottom: 7 }}
              accessibilityRole="button" accessibilityLabel={`${s.water}: ${item.name}`}>
              <Animated.Image source={require('../../assets/images/watering-can.png')}
                style={[styles.waterButtonIcon, wateringId === item.id && { opacity: canOpacity }]} />
              {wateringId === item.id && <Animated.Text pointerEvents="none" style={[styles.waterDrop,
                { opacity: dropOpacity, transform: [{ translateY: dropY }] }]}>💧</Animated.Text>}
            </Pressable>}
          </View>
        </View>;
      }}
      ListEmptyComponent={ready ? <View style={styles.empty}><Text style={styles.emptyIcon}>🪴</Text>
        <Text style={styles.emptyTitle}>{s.empty}</Text>
        <Text style={styles.emptyHint}>{s.emptyHint}</Text></View> : null}
      ListFooterComponent={<View style={styles.historyFooter}>
        <Pressable onPress={() => router.push('/history')} style={styles.historyLink} accessibilityRole="button"><Text style={styles.historyLinkText}>{s.history}</Text></Pressable>
      </View>} />
    <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
      <View pointerEvents="none" style={styles.bottomBackground} />
      <View pointerEvents="none" style={styles.bottomBackgroundLeft} />
      <View pointerEvents="none" style={styles.bottomBackgroundMiddle} />
      <View pointerEvents="none" style={styles.bottomBackgroundRight} />
      <View style={styles.bottomActions}>
        <Pressable onPress={() => openForm()} style={styles.addButton} accessibilityRole="button"><Text style={styles.addButtonText}>＋  {s.add}</Text></Pressable>
      </View>
    </SafeAreaView>
    </View>

    <Modal visible={editing !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
      <SafeAreaView style={styles.modalSafe}><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeading}><Text style={styles.modalTitle}>{editing === 'new' ? s.add : s.edit}</Text>
          <Pressable onPress={() => setEditing(null)}><Text style={styles.close}>×</Text></Pressable></View>
        <Text style={styles.label}>{s.name}</Text><TextInput value={name} onChangeText={setName} placeholder={s.name}
          style={styles.input} maxLength={60} placeholderTextColor={palette.muted} />
        <Text style={styles.label}>{s.icon}</Text><View style={styles.iconGrid}>{PLANT_ICONS.map(value => <Pressable key={value}
          onPress={() => setIcon(value)} style={[styles.iconChoice, icon === value && styles.iconChoiceSelected]}
          accessibilityRole="button" accessibilityState={{ selected: icon === value }}><Text style={styles.iconChoiceText}>{value}</Text></Pressable>)}</View>
        <Text style={styles.label}>{s.interval}</Text><TextInput value={interval} onChangeText={setInterval} keyboardType="number-pad"
          style={styles.input} maxLength={3} placeholder="7" placeholderTextColor={palette.muted} />
        {!!formError && <Text style={styles.error}>{formError}</Text>}
        <Pressable onPress={save} disabled={busy} style={styles.saveButton}><Text style={styles.saveButtonText}>{s.save}</Text></Pressable>
        {editing && editing !== 'new' && <Pressable onPress={() => confirmDelete(editing)} style={styles.deleteButton}>
          <Text style={styles.deleteText}>{s.delete}</Text></Pressable>}
      </ScrollView></SafeAreaView>
    </Modal>

  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.surface },
  body: { flex: 1, backgroundColor: palette.canvas },
  appBar: { backgroundColor: palette.surface, minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  brand: { width: 38, height: 38, borderRadius: 12, backgroundColor: palette.softSuccess, alignItems: 'center', justifyContent: 'center' },
  brandIcon: { width: 34, height: 34 }, appTitle: { flex: 1, color: palette.ink, fontSize: 22, fontWeight: '800' },
  settingsButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, settingsIcon: { width: 30, height: 30 },
  list: { flex: 1, backgroundColor: palette.canvas }, listContent: { flexGrow: 1 }, header: { padding: 16, gap: 16 },
  summary: { minHeight: 126, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: palette.muted, fontSize: 14 }, summaryCount: { color: palette.ink, fontSize: 44, fontWeight: '800' }, summaryArt: { fontSize: 45 },
  headingRow: { flexDirection: 'row', alignItems: 'center' }, heading: { color: palette.ink, fontSize: 22, fontWeight: '800' }, count: { color: palette.muted, fontSize: 16 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: 16, gap: 16 },
  lastCard: { marginBottom: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, plantIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: palette.softSuccess, alignItems: 'center', justifyContent: 'center' },
  plantEmoji: { fontSize: 32 }, cardText: { flex: 1, gap: 4 }, plantName: { color: palette.ink, fontSize: 18, fontWeight: '700' }, cardMeta: { color: palette.muted, fontSize: 12 },
  cardArrowSlot: { width: 44, alignItems: 'center', justifyContent: 'center' }, cardArrowIcon: { width: 30, height: 30 },
  cardBottom: { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusPill: { backgroundColor: palette.softSuccess, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }, statusDue: { backgroundColor: palette.soft },
  statusText: { color: palette.green, fontSize: 12, fontWeight: '700' }, statusDueText: { color: palette.accent },
  waterButton: { backgroundColor: palette.accent, borderRadius: 10, width: 44, height: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  waterButtonIcon: { width: 30, height: 30 },
  waterDrop: { position: 'absolute', top: 4, left: 0, width: 44, textAlign: 'center', fontSize: 18, lineHeight: 20, includeFontPadding: false },
  empty: { marginHorizontal: 16, padding: 28, borderRadius: 20, alignItems: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, gap: 8 },
  emptyIcon: { fontSize: 42 }, emptyTitle: { color: palette.ink, fontSize: 19, fontWeight: '800', textAlign: 'center' }, emptyHint: { color: palette.muted, textAlign: 'center', lineHeight: 21 },
  historyFooter: { backgroundColor: palette.canvas, paddingTop: 11, paddingBottom: 12 + ADD_BUTTON_RADIUS },
  historyLink: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }, historyLinkText: { color: palette.accent, fontWeight: '700' },
  bottomSafeArea: { marginTop: -ADD_BUTTON_RADIUS, backgroundColor: 'transparent' },
  bottomBackground: { position: 'absolute', top: ADD_BUTTON_RADIUS, bottom: 0, left: 0, right: 0, backgroundColor: palette.canvas },
  bottomBackgroundLeft: { position: 'absolute', top: 0, left: 0, width: ADD_BUTTON_INSET, height: ADD_BUTTON_RADIUS, backgroundColor: palette.canvas },
  bottomBackgroundMiddle: { position: 'absolute', top: 0, left: ADD_BUTTON_INSET + ADD_BUTTON_RADIUS, right: ADD_BUTTON_INSET + ADD_BUTTON_RADIUS, height: ADD_BUTTON_RADIUS, backgroundColor: palette.canvas },
  bottomBackgroundRight: { position: 'absolute', top: 0, right: 0, width: ADD_BUTTON_INSET, height: ADD_BUTTON_RADIUS, backgroundColor: palette.canvas },
  bottomActions: { paddingHorizontal: ADD_BUTTON_INSET, paddingBottom: 29 },
  addButton: { minHeight: 54, borderRadius: ADD_BUTTON_RADIUS, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: palette.surface, fontWeight: '800', fontSize: 16 },
  modalSafe: { flex: 1, backgroundColor: palette.canvas }, modalContent: { padding: 20, gap: 12, flexGrow: 1 }, modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { color: palette.ink, fontSize: 23, fontWeight: '800' }, close: { color: palette.muted, fontSize: 32, lineHeight: 36 },
  label: { color: palette.ink, fontWeight: '700', marginTop: 6 }, input: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 16, minHeight: 52, color: palette.ink, fontSize: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, iconChoice: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  iconChoiceSelected: { borderColor: palette.accent, backgroundColor: palette.soft }, iconChoiceText: { fontSize: 27 },
  error: { color: palette.error, fontSize: 13 }, saveButton: { backgroundColor: palette.accent, minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveButtonText: { color: palette.surface, fontWeight: '800', fontSize: 16 }, deleteButton: { alignItems: 'center', padding: 12 }, deleteText: { color: palette.error, fontWeight: '700' },
});
