import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';

interface TutorialStep {
  title: string;
  icon: string;
  text: string;
  tip: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Kralliginiza Hos Geldiniz!',
    icon: '🏰',
    text: 'Bir kale ve kucuk bir orduyla basliyorsunuz. Amactniz krallginizi genisletmek ve rakiplerinizi yenmek.',
    tip: 'Haritada surukleme ile gezinin, pinch ile yakinlasip uzaklasin.',
  },
  {
    title: 'Toprak Genislet',
    icon: '🚩',
    text: 'Ordunuzu secip komsu hex\'lere tasiyarak yeni topraklar fethdedin. Her toprak size kaynak saglar.',
    tip: 'Hex\'e dokunup "Ordu Tasi" butonuna basin, sonra hedef hex\'e dokunun.',
  },
  {
    title: 'Bina Kur',
    icon: '🏗️',
    text: 'Topraginzdaki bos hex\'lere bina kurun:\n• Ciftlik = yiyecek\n• Maden = demir & tas\n• Kereste = odun\n• Pazar = altin',
    tip: 'Her terrain tipinde farkli binalar kurulabilir. Dag\'a maden, ormana kereste!',
  },
  {
    title: 'Birim Egit',
    icon: '⚔️',
    text: 'Kalenize dokunup "Birim Egit" ile asker uretin. 5 birim tipi var, her birinin ozel yetenegi var.',
    tip: 'Baslangicta Savasci + Kasif yeterli. Okcu ve Suvari icin teknoloji arastirin.',
  },
  {
    title: 'Arastirma Yap',
    icon: '🔬',
    text: 'Ust bardaki "Arastir" butonuyla yeni teknolojiler kesfdedin. Yeni birimler, binalar ve bonuslar acin.',
    tip: 'Ilk arastirma olarak "Okculuk" veya "Tarim" oneririz.',
  },
  {
    title: 'Kahraman Kirala',
    icon: '⚔️',
    text: 'Kahramanlar ordunuza ozel bonuslar verir. Ust bardaki "Kahraman" ile kiralayin ve bir orduya atayin.',
    tip: 'Kagan saldiri icin, Arslan savunma icin idealdir.',
  },
  {
    title: 'Diplomasi',
    icon: '🏳️',
    text: 'Rakiplerinizle saldirmazlik pakti veya ittifak kurabilir, harac gonderebilirsiniz.',
    tip: 'Iki cephede savas riskli! Bir rakiple anlasip digerine odaklanin.',
  },
  {
    title: 'Zafer Yollari',
    icon: '👑',
    text: '4 farkli yoldan kazanabilirsiniz:\n• Askeri: Tum kaleleri yik\n• Ekonomik: 1000 altin + 20 toprak\n• Teknolojik: Tum tech\'leri arastir\n• Hakimiyet: Haritanin %60\'i',
    tip: 'Alt bardaki ilerleme cubugunu takip edin. En yakin zafere odaklanin!',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TutorialModal({ visible, onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleNext = () => {
    if (isLast) {
      setStep(0);
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStep(s => s - 1);
  };

  const handleSkip = () => {
    setStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Progress dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
              />
            ))}
          </View>

          {/* Ikon */}
          <Text style={styles.icon}>{current.icon}</Text>

          {/* Baslik */}
          <Text style={styles.title}>{current.title}</Text>

          {/* Aciklama */}
          <Text style={styles.text}>{current.text}</Text>

          {/* Ipucu */}
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>Ipucu</Text>
            <Text style={styles.tipText}>{current.tip}</Text>
          </View>

          {/* Adim sayaci */}
          <Text style={styles.counter}>{step + 1} / {STEPS.length}</Text>

          {/* Butonlar */}
          <View style={styles.buttons}>
            {!isFirst ? (
              <TouchableOpacity style={styles.prevBtn} onPress={handlePrev}>
                <Text style={styles.prevText}>Geri</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>Atla</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextText}>{isLast ? 'Basla!' : 'Ileri'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.xl,
    padding: SPACE.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACE.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    width: 20,
  },
  dotDone: {
    backgroundColor: COLORS.green,
  },
  icon: {
    fontSize: 52,
    marginBottom: SPACE.md,
  },
  title: {
    color: COLORS.gold,
    fontSize: FONT.h2,
    fontWeight: FONT.black,
    textAlign: 'center',
    marginBottom: SPACE.md,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: FONT.body,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACE.lg,
  },
  tipBox: {
    width: '100%',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    marginBottom: SPACE.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tipLabel: {
    color: COLORS.primary,
    fontSize: FONT.tiny,
    fontWeight: FONT.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACE.xs,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: FONT.caption,
    lineHeight: 18,
  },
  counter: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    marginBottom: SPACE.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACE.md,
    width: '100%',
  },
  prevBtn: {
    flex: 1,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  prevText: {
    color: COLORS.textSecondary,
    fontSize: FONT.body,
    fontWeight: FONT.semi,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: SPACE.md,
    alignItems: 'center',
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: FONT.body,
  },
  nextBtn: {
    flex: 2,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
  },
  nextText: {
    color: COLORS.textInverse,
    fontSize: FONT.body,
    fontWeight: FONT.bold,
  },
});
