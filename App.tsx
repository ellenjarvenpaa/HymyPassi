import React, {
  createContext,
  useContext,
  useState,
  PropsWithChildren,
  useRef,
  useEffect,
} from "react";
import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  ImageBackground,
  Alert,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";

// Data layer
import {
  SQLiteProvider,
  useSQLiteContext,
  SQLiteDatabase,
} from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const bg = require("./assets/bg.png");

/* -------------------- Language setup -------------------- */
type LangCode = "fi" | "en" | "sv";

const translations = {
  fi: {
    startTitle: "HyMy-kylän palautekysely",
    startButton: "Aloita",
    rateHint: "Arvioi kokemuksesi asteikolla 1–5 tähteä",
    scaleHint: "1 = huono, 5 = erinomainen",
    q1: "Palvelut olivat helposti saatavilla",
    q2: "Palvelukokemus oli mielestäni viihtyisä ja sujuva",
    q3: "Koen saaneeni tukea tai tarvittaessa ohjausta",
    q4: "Haluaisin tulla uudelleen / suosittelen palvelua muille",
    q5: "Haluatko antaa avointa palautetta?",
    openFeedback: "Avoin palaute",
    placeholder: "Kirjoita palaute...",
    serviceTitle: "Käyttämäsi palvelu",
    skipService: "En halua kertoa tätä",
    send: "Lähetä",
    next: "Seuraava",
    back: "Takaisin",
    yes: "Kyllä",
    no: "Ei",
    thanks: "Kiitos!",
    received:
      "Palautteesi tukee opiskelijoiden kasvua tulevaisuuden osaajiksi. \u2764\uFE0F",
    new: "Uusi vastaus",
    chooseService: "Valitse palvelu",
    adminTitle: "Ylläpito",
    exportAll: "Vie kaikki vastaukset CSV:ksi",
    exportHint: "Vie kaikki vastaukset CSV:ksi.",
  },
  en: {
    startTitle: "HyMy-kylä feedback survey",
    startButton: "Start",
    rateHint: "Rate your experience from 1–5 stars",
    scaleHint: "1 = poor, 5 = excellent",
    q1: "Services were easily accessible",
    q2: "My service experience was pleasant and smooth",
    q3: "I felt supported or guided when needed",
    q4: "I would like to return / I recommend the service to others",
    q5: "Would you like to give open feedback?",
    openFeedback: "Open feedback",
    placeholder: "Write your feedback...",
    serviceTitle: "Service used",
    skipService: "I prefer not to say",
    send: "Submit",
    next: "Next",
    back: "Back",
    yes: "Yes",
    no: "No",
    thanks: "Thank you!",
    received:
      "Your feedback supports students’ growth into future professionals. \u2764\uFE0F",
    new: "New response",
    chooseService: "Select service",
    adminTitle: "Admin",
    exportAll: "Export all responses to CSV",
    exportHint: "Export all responses to CSV.",
  },
  sv: {
    startTitle: "HyMy-kylä feedbackenkät",
    startButton: "Börja",
    rateHint: "Bedöm din upplevelse från 1–5 stjärnor",
    scaleHint: "1 = dålig, 5 = utmärkt",
    q1: "Tjänsterna var lättillgängliga",
    q2: "Min serviceupplevelse var trevlig och smidig",
    q3: "Jag fick stöd eller vägledning vid behov",
    q4: "Jag skulle gärna komma tillbaka / rekommenderar tjänsten till andra",
    q5: "Vill du ge öppen feedback?",
    openFeedback: "Öppen feedback",
    placeholder: "Skriv din feedback...",
    serviceTitle: "Använd tjänst",
    skipService: "Jag vill inte säga",
    send: "Skicka",
    next: "Nästa",
    back: "Tillbaka",
    yes: "Ja",
    no: "Nej",
    thanks: "Tack!",
    received:
      "Din respons stöder studenternas utveckling till framtidens yrkeskunniga. \u2764\uFE0F",
    new: "Nytt svar",
    chooseService: "Välj tjänst",
    adminTitle: "Administration",
    exportAll: "Exportera alla svar till CSV",
    exportHint: "Exportera alla svar till CSV.",
  },
} as const;

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: keyof (typeof translations)["fi"]) => string;
}
const LanguageContext = createContext<LanguageContextValue | null>(null);
const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be inside LanguageProvider");
  return ctx;
};
function LanguageProvider({ children }: PropsWithChildren) {
  const [lang, setLang] = useState<LangCode>("fi");
  const t = (key: keyof (typeof translations)["fi"]) => translations[lang][key];
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
function LanguagePicker() {
  const { lang, setLang } = useLang();
  return (
    <View style={{ alignSelf: "center", marginVertical: 8 }}>
      <Picker
        selectedValue={lang}
        onValueChange={(v) => setLang(v as LangCode)}
        style={{ width: 220 }}
      >
        <Picker.Item label="🇫🇮 Suomi" value="fi" />
        <Picker.Item label="🇬🇧 English" value="en" />
        <Picker.Item label="🇸🇪 Svenska" value="sv" />
      </Picker>
    </View>
  );
}

/* -------------------- Types -------------------- */
type StarKeys = "q1" | "q2" | "q3" | "q4";
interface SurveyAnswers {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: boolean | null;
  feedback: string;
  service: string; // "" = not disclosed
}
type RootStackParamList = {
  Start: undefined;
  Q1: QuestionRouteParams;
  Q2: QuestionRouteParams;
  Q3: QuestionRouteParams;
  Q4: QuestionRouteParams;
  Q5: undefined;
  OpenFeedback: undefined;
  Service: undefined;
  Submit: undefined;
  AdminTools: undefined;
};
interface QuestionRouteParams {
  keyName: StarKeys;
  next: keyof RootStackParamList;
}

/* -------------------- Survey State -------------------- */
interface SurveyContextValue {
  answers: SurveyAnswers;
  update: (patch: Partial<SurveyAnswers>) => void;
  reset: () => void;
}
const SurveyContext = createContext<SurveyContextValue | null>(null);
const useSurvey = () => {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error("useSurvey must be used inside SurveyProvider");
  return ctx;
};
function SurveyProvider({ children }: PropsWithChildren) {
  const [answers, setAnswers] = useState<SurveyAnswers>({
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: null,
    feedback: "",
    service: "",
  });
  const update = (patch: Partial<SurveyAnswers>) =>
    setAnswers((s) => ({ ...s, ...patch }));
  const reset = () =>
    setAnswers({
      q1: 0,
      q2: 0,
      q3: 0,
      q4: 0,
      q5: null,
      feedback: "",
      service: "",
    });
  return (
    <SurveyContext.Provider value={{ answers, update, reset }}>
      {children}
    </SurveyContext.Provider>
  );
}

/* -------------------- Orientation helper -------------------- */
function useIsLandscape() {
  const { width, height } = useWindowDimensions();
  return width > height;
}

/* -------------------- UI Bits -------------------- */
interface RatingStarsProps {
  value: number;
  onChange: (v: number) => void;
}
function RatingStars({ value, onChange }: RatingStarsProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignSelf: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          style={[styles.star, value >= n && styles.starActive]}
        >
          <Text style={[styles.starText, value >= n && styles.starTextActive]}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
interface YesNoProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
}
function YesNo({ value, onChange }: YesNoProps) {
  const { t } = useLang();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignSelf: "center" }}>
      <Pressable
        onPress={() => onChange(true)}
        style={[styles.pill, value === true && styles.pillActive]}
      >
        <Text
          style={[styles.pillText, value === true && styles.pillTextActive]}
        >
          {t("yes")}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(false)}
        style={[styles.pill, value === false && styles.pillActive2]}
      >
        <Text
          style={[styles.pillText, value === false && styles.pillTextActive2]}
        >
          {t("no")}
        </Text>
      </Pressable>
    </View>
  );
}

/* -------------------- Screen wrapper -------------------- */
const Screen: React.FC<React.PropsWithChildren> = ({ children }) => {
  const isLandscape = useIsLandscape();
  return (
    <ImageBackground source={bg} style={styles.bg} imageStyle={styles.bgImage}>
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <View
          style={[styles.container, isLandscape && styles.containerLandscape]}
        >
          {children}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

/* -------------------- Data helpers (SQLite) -------------------- */
// Keep the current q1..q5 schema (no deletion/migration here)
async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Q1: "Services were easily accessible"
      services_were_easily_accessible INTEGER NOT NULL,

      -- Q2: "My service experience was pleasant and smooth"
      service_experience_pleasant_smooth INTEGER NOT NULL,

      -- Q3: "I felt supported or guided when needed"
      felt_supported_or_guided INTEGER NOT NULL,

      -- Q4: "I would like to return / I recommend the service to others"
      would_return_or_recommend INTEGER NOT NULL,

      -- Q5: Would you like to give open feedback?
      -- 1 = true, 0 = false, NULL = not answered
      wants_open_feedback INTEGER NULL,

      feedback TEXT NOT NULL,
      service TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_responses_created_at
      ON responses(created_at);
  `);
}

async function saveResponse(db: SQLiteDatabase, a: SurveyAnswers) {
  const q5val = a.q5 === null ? null : a.q5 ? 1 : 0;

  await db.runAsync(
    `INSERT INTO responses (
       services_were_easily_accessible,
       service_experience_pleasant_smooth,
       felt_supported_or_guided,
       would_return_or_recommend,
       wants_open_feedback,
       feedback,
       service
     )
     VALUES (?,?,?,?,?,?,?)`,
    [
      a.q1, // Q1 → services_were_easily_accessible
      a.q2, // Q2 → service_experience_pleasant_smooth
      a.q3, // Q3 → felt_supported_or_guided
      a.q4, // Q4 → would_return_or_recommend
      q5val, // Q5 (yes/no) → wants_open_feedback
      a.feedback.trim(),
      a.service.trim(),
    ]
  );
}

async function exportCsv(db: SQLiteDatabase): Promise<string> {
  const rows = await db.getAllAsync<{
    id: number;
    created_at: string;
    services_were_easily_accessible: number;
    service_experience_pleasant_smooth: number;
    felt_supported_or_guided: number;
    would_return_or_recommend: number;
    wants_open_feedback: number | null;
    feedback: string;
    service: string;
  }>(`
    SELECT
      id,
      created_at,
      services_were_easily_accessible,
      service_experience_pleasant_smooth,
      felt_supported_or_guided,
      would_return_or_recommend,
      wants_open_feedback,
      feedback,
      service
    FROM responses
    ORDER BY id ASC
  `);

  const header = [
    "id",
    "created_at",
    "services_were_easily_accessible",
    "service_experience_pleasant_smooth",
    "felt_supported_or_guided",
    "would_return_or_recommend",
    "wants_open_feedback",
    "feedback",
    "service",
  ];

  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.created_at,
        r.services_were_easily_accessible,
        r.service_experience_pleasant_smooth,
        r.felt_supported_or_guided,
        r.would_return_or_recommend,
        r.wants_open_feedback === null ? "" : r.wants_open_feedback,
        r.feedback,
        r.service,
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ];

  const csv = lines.join("\n");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileUri = `${FileSystem.documentDirectory}responses-${stamp}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csv);

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Vie CSV",
      });
    } else {
      Alert.alert("CSV luotu", `Tiedosto: ${fileUri}`);
    }
  } catch (e) {
    console.warn("Sharing failed:", e);
  }

  return fileUri;
}

/* -------------------- Admin unlock helpers -------------------- */
const ADMIN_PIN = String(Constants?.expoConfig?.extra?.adminPin ?? "2323");

function AdminPinModal({
  visible,
  onClose,
  onAuthed,
}: {
  visible: boolean;
  onClose: () => void;
  onAuthed: () => void;
}) {
  const [pin, setPin] = React.useState("");
  const check = () => {
    if (pin === ADMIN_PIN) {
      setPin("");
      onAuthed();
    } else {
      setPin("");
      Alert.alert("Väärä PIN", "Yritä uudelleen.");
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16 }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}
          >
            Syötä henkilökunnan PIN
          </Text>
          <TextInput
            placeholder="PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            style={[styles.textarea, { minHeight: undefined, height: 48 }]}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 12,
            }}
          >
            <Pressable
              style={styles.secondary}
              onPress={() => {
                setPin("");
                onClose();
              }}
            >
              <Text>Peruuta</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={check}>
              <Text style={styles.buttonText}>Avaa</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------- Screens -------------------- */
type StartProps = NativeStackScreenProps<RootStackParamList, "Start">;
function StartScreen({ navigation }: StartProps) {
  const { t } = useLang();
  const [showPin, setShowPin] = React.useState(false);

  // Secret sequence step:
  // 0 = nothing, 1 = left corner long-pressed, waiting for right
  const [secretStep, setSecretStep] = React.useState<0 | 1>(0);
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSecretState = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setSecretStep(0);
  };

  const handleLeftSecret = () => {
    // First step in the sequence
    clearSecretState();
    setSecretStep(1);
    // If right corner doesn't happen within 5s, reset
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      setSecretStep(0);
    }, 5000); // 5 seconds to move to the right corner
  };

  const handleRightSecret = () => {
    if (secretStep === 1) {
      // Correct sequence: left then right → open PIN
      clearSecretState();
      setShowPin(true);
    }
    // If secretStep is 0, ignore – no sequence started
  };

  // Cleanup if the screen unmounts
  React.useEffect(() => {
    return () => {
      clearSecretState();
    };
  }, []);

  return (
    <Screen>
      <LanguagePicker />

      {/* Title is just text now */}
      <Text style={styles.title}>{t("startTitle")}</Text>

      <Text style={styles.helperText}>{t("rateHint")}</Text>

      <Pressable
        style={styles.button}
        onPress={() =>
          navigation.navigate("Q1", { keyName: "q1", next: "Q2" })
        }
      >
        <Text style={styles.buttonText}>{t("startButton")}</Text>
      </Pressable>

      {/* SECRET CORNERS – invisible, but tappable */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Top-left secret area */}
        <Pressable
          onLongPress={handleLeftSecret}
          delayLongPress={2000} // 2 second
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 80,
            height: 80,
            // backgroundColor: "transparent", // keep invisible
          }}
          hitSlop={20} // easier to hit
        />

        {/* Top-right secret area */}
        <Pressable
          onLongPress={handleRightSecret}
          delayLongPress={1000} // 1 second
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 80,
            height: 80,
            // backgroundColor: "transparent",
          }}
          hitSlop={20}
        />
      </View>

      <AdminPinModal
        visible={showPin}
        onClose={() => setShowPin(false)}
        onAuthed={() => {
          setShowPin(false);
          navigation.navigate("AdminTools");
        }}
      />
    </Screen>
  );
}



type AdminProps = NativeStackScreenProps<RootStackParamList, "AdminTools">;
function AdminTools({ navigation }: AdminProps) {
  const { t } = useLang();
  const db = useSQLiteContext();
  const handleExport = async () => {
    try {
      const path = await exportCsv(db);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("CSV luotu", `Tiedosto: ${path}`);
      }
    } catch (e: any) {
      Alert.alert(
        "CSV-vienti epäonnistui",
        e?.message ?? String(e)
      );
    }
  };
  return (
    <Screen>
      <Text style={styles.title}>{t("adminTitle")}</Text>
      <Text style={[styles.question, { marginBottom: 16 }]}>
        {t("exportHint")}
      </Text>
      <Pressable style={styles.button} onPress={handleExport}>
        <Text style={styles.buttonText}>{t("exportAll")}</Text>
      </Pressable>
      <Pressable
        style={[styles.secondary, { alignSelf: "center", marginTop: 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Text>{t("back")}</Text>
      </Pressable>
    </Screen>
  );
}

type GenericStarQuestionProps = NativeStackScreenProps<
  RootStackParamList,
  "Q1" | "Q2" | "Q3" | "Q4"
>;
function GenericStarQuestion({
  route,
  navigation,
}: GenericStarQuestionProps) {
  const { t } = useLang();
  const { keyName, next } = route.params as QuestionRouteParams;
  const { answers, update } = useSurvey();

  return (
    <Screen>
      <Text style={styles.question}>{t(keyName)}</Text>
      <Text style={styles.subnote}>{t("scaleHint")}</Text>
      <RatingStars
        value={answers[keyName]}
        onChange={(v) =>
          update({ [keyName]: v } as Partial<SurveyAnswers>)
        }
      />
      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>{t("back")}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { opacity: answers[keyName] ? 1 : 0.5 }]}
          disabled={!answers[keyName]}
          onPress={() => navigation.navigate(next)}
        >
          <Text style={styles.buttonText}>{t("next")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type Q5Props = NativeStackScreenProps<RootStackParamList, "Q5">;
function Question5({ navigation }: Q5Props) {
  const { t } = useLang();
  const { answers, update } = useSurvey();
  return (
    <Screen>
      <Text style={styles.question}>{t("q5")}</Text>
      <YesNo value={answers.q5} onChange={(v) => update({ q5: v })} />
      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>{t("back")}</Text>
        </Pressable>
        <Pressable
          style={[
            styles.button,
            { opacity: answers.q5 !== null ? 1 : 0.5 },
          ]}
          disabled={answers.q5 === null}
          onPress={() =>
            navigation.navigate(answers.q5 ? "OpenFeedback" : "Service")
          }
        >
          <Text style={styles.buttonText}>{t("next")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type OpenFeedbackProps = NativeStackScreenProps<
  RootStackParamList,
  "OpenFeedback"
>;
function OpenFeedback({ navigation }: OpenFeedbackProps) {
  const { t } = useLang();
  const { answers, update } = useSurvey();
  return (
    <Screen>
      <Text style={styles.question}>{t("openFeedback")}</Text>
      <TextInput
        placeholder={t("placeholder")}
        value={answers.feedback}
        onChangeText={(val) => update({ feedback: val })}
        multiline
        style={styles.textarea}
      />
      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>{t("back")}</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate("Service")}
        >
          <Text style={styles.buttonText}>{t("next")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type ServiceProps = NativeStackScreenProps<RootStackParamList, "Service">;
function Service({ navigation }: ServiceProps) {
  const { t } = useLang();
  const { answers, update } = useSurvey();

  const services = [
    t("chooseService"),
    "Apuvälinepalvelut / Assistive services",
    "Fysioterapiapalvelut / Physiotherapy",
    "Hoitajavastaanotto / Nurse services",
    "Jalkaterapiapalvelut / Podiatry",
    "KyläOPTIKKO -optikkopalvelut / Optician",
    "Ohjattu ryhmätoiminta / Group activities",
    "Osteopatiapalvelut / Osteopathy",
    "Perhevalmennus / Family guidance",
    "Senioripalvelut / Senior services",
    "Suun terveydenhuollon palvelut / Dental care",
    "Toimintaterapiapalvelut / Occupational therapy",
    "Muu / Other",
  ];

  const skipService = () => {
    update({ service: "" });
    navigation.navigate("Submit");
  };

  return (
    <Screen>
      <Text style={styles.question}>{t("serviceTitle")}</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={answers.service || services[0]}
          onValueChange={(v: string) =>
            update({ service: v === services[0] ? "" : v })
          }
        >
          {services.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={skipService}
        style={styles.textLink}
      >
        <Text style={styles.textLinkLabel}>{t("skipService")}</Text>
      </Pressable>

      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>{t("back")}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { opacity: answers.service ? 1 : 0.5 }]}
          disabled={!answers.service}
          onPress={() => navigation.navigate("Submit")}
        >
          <Text style={styles.buttonText}>{t("send")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type SubmitProps = NativeStackScreenProps<RootStackParamList, "Submit">;
function SubmitScreen({ navigation }: SubmitProps) {
  const { t } = useLang();
  const db = useSQLiteContext();
  const { answers, reset } = useSurvey();
  const savedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (savedRef.current) return;
      try {
        await saveResponse(db, answers);
        savedRef.current = true;
      } catch (e: any) {
        if (mounted)
          Alert.alert(
            "Tallennus epäonnistui",
            e?.message ?? String(e)
          );
      }
    })();
    return () => {
      mounted = false;
    };
  }, [db, answers]);

  const handleNew = () => {
    reset();
    navigation.popToTop();
  };

  return (
    <Screen>
      <Text style={styles.title}>{t("thanks")}</Text>
      <Text style={styles.question}>{t("received")}</Text>
      <Pressable
        style={[styles.button, { marginTop: 24 }]}
        onPress={handleNew}
      >
        <Text style={styles.buttonText}>{t("new")}</Text>
      </Pressable>
    </Screen>
  );
}

/* -------------------- Nav Mount -------------------- */
const Stack = createNativeStackNavigator<RootStackParamList>();
export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="feedback_v2.db" onInit={migrateDbIfNeeded}>
        <LanguageProvider>
          <SurveyProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Start" component={StartScreen} />
                <Stack.Screen name="AdminTools" component={AdminTools} />
                <Stack.Screen
                  name="Q1"
                  component={GenericStarQuestion}
                  initialParams={{ keyName: "q1", next: "Q2" }}
                />
                <Stack.Screen
                  name="Q2"
                  component={GenericStarQuestion}
                  initialParams={{ keyName: "q2", next: "Q3" }}
                />
                <Stack.Screen
                  name="Q3"
                  component={GenericStarQuestion}
                  initialParams={{ keyName: "q3", next: "Q4" }}
                />
                <Stack.Screen
                  name="Q4"
                  component={GenericStarQuestion}
                  initialParams={{ keyName: "q4", next: "Q5" }}
                />
                <Stack.Screen name="Q5" component={Question5} />
                <Stack.Screen
                  name="OpenFeedback"
                  component={OpenFeedback}
                />
                <Stack.Screen name="Service" component={Service} />
                <Stack.Screen name="Submit" component={SubmitScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </SurveyProvider>
        </LanguageProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#f6dce8" },
  bgImage: { resizeMode: "cover" },
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    justifyContent: "center",
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  containerLandscape: { paddingHorizontal: 40 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  question: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#ff5000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    backgroundColor: "#fff",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  star: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#d0d0d0",
    backgroundColor: "#fff",
  },
  starActive: { backgroundColor: "#fffddbff", borderColor: "#fff000" },
  starText: { fontSize: 22, color: "#aaaaaa" },
  starTextActive: { color: "#fff000" },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: "#8ceba5", borderColor: "#8ceba5" },
  pillText: { fontWeight: "600" },
  pillTextActive: { color: "#0a8f2a" },
  pillActive2: { backgroundColor: "#babbbd", borderColor: "#babbbd" },
  pillTextActive2: { color: "#505050ff" },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: "#ffffffff",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffffff",
  },
  textLink: { alignSelf: "center", marginTop: 8, padding: 6 },
  textLinkLabel: {
    textDecorationLine: "underline",
    color: "#4b5563",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 12,
  },
  subnote: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 6,
  },
  debugCorner: {
    flex: 1,
    backgroundColor: "rgba(0, 255, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(0, 150, 0, 0.8)",
  },
});
