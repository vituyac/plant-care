import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlants } from '../state/PlantProvider';
import { strings } from '../ui/strings';
import { palette } from '../ui/theme';

const PRIVACY_POLICY_URL = 'https://vituyac.github.io/plant-care/';

export default function SettingsScreen() {
  const { language, setLanguage } = usePlants();
  const s = strings[language];
  function goBack() {
    if (router.canDismiss()) router.back();
    else router.replace('/');
  }

  return <SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.bar}><Pressable onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel={language === 'ru' ? 'Назад' : 'Back'}>
      <Image source={require('../../assets/images/back.png')} style={styles.backIcon} /></Pressable>
      <Text style={styles.title}>{s.settings}</Text></View>
    <View style={styles.content}><Text style={styles.label}>{s.language}</Text>
      <View style={styles.card}>{([['ru', 'Русский'], ['en', 'English']] as const).map(([code, title]) => <Pressable key={code}
        onPress={() => { void setLanguage(code).catch(() => Alert.alert(s.saveError)); }} style={styles.row} accessibilityRole="button" accessibilityState={{ selected: language === code }}>
        <Text style={styles.rowText}>{title}</Text><Text style={styles.check}>{language === code ? '✓' : ''}</Text></Pressable>)}</View>
      <Pressable onPress={() => { void WebBrowser.openBrowserAsync(`${PRIVACY_POLICY_URL}#${language}`).catch(() => Alert.alert(s.privacyOpenError)); }}
        style={styles.privacyCard} accessibilityRole="link" accessibilityLabel={s.privacyPolicy}>
        <Text style={styles.rowText}>{s.privacyPolicy}</Text><Text style={styles.privacyArrow}>↗</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.surface }, bar: { backgroundColor: palette.surface, minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, backIcon: { width: 30, height: 30 }, title: { color: palette.ink, fontSize: 22, fontWeight: '800' },
  content: { flex: 1, backgroundColor: palette.canvas, padding: 16, gap: 12 }, label: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  card: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 20, overflow: 'hidden' },
  row: { minHeight: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.border },
  rowText: { flex: 1, color: palette.ink, fontSize: 16 }, check: { color: palette.accent, fontSize: 20, fontWeight: '800' },
  privacyCard: { minHeight: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 20 },
  privacyArrow: { color: palette.accent, fontSize: 21 },
});
