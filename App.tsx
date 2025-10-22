import React, { createContext, useContext, useState, PropsWithChildren, useRef, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  ImageBackground,
  Alert,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// ---- NEW: data layer
import { SQLiteProvider, useSQLiteContext, SQLiteDatabase } from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

// Background image asset (place a file at ./assets/bg.png or adjust the path)
const bg = require("./assets/bg.png");

/* -------------------- Types -------------------- */
type StarKeys = "q1" | "q2" | "q3" | "q4";

interface SurveyAnswers {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: boolean | null;
  feedback: string;
  service: string; // empty string means "not disclosed"
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
};

interface QuestionRouteParams {
  keyName: StarKeys;
  question: string;
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
    q1: 0, q2: 0, q3: 0, q4: 0,
    q5: null,
    feedback: "",
    service: "",
  });
  const update = (patch: Partial<SurveyAnswers>) =>
    setAnswers((s) => ({ ...s, ...patch }));
  const reset = () => setAnswers({ q1: 0, q2: 0, q3: 0, q4: 0, q5: null, feedback: "", service: "" });
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
interface RatingStarsProps { value: number; onChange: (v: number) => void; }
function RatingStars({ value, onChange }: RatingStarsProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignSelf: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="button"
          accessibilityLabel={`Tähti ${n}`}
          style={[styles.star, value >= n && styles.starActive]}
        >
          <Text style={[styles.starText, value >= n && styles.starTextActive]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

interface YesNoProps { value: boolean | null; onChange: (v: boolean) => void; }
function YesNo({ value, onChange }: YesNoProps) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignSelf: "center" }}>
      <Pressable onPress={() => onChange(true)} style={[styles.pill, value === true && styles.pillActive]}>
        <Text style={[styles.pillText, value === true && styles.pillTextActive]}>Kyllä</Text>
      </Pressable>
      <Pressable onPress={() => onChange(false)} style={[styles.pill, value === false && styles.pillActive2]}>
        <Text style={[styles.pillText, value === false && styles.pillTextActive2]}>Ei</Text>
      </Pressable>
    </View>
  );
}

/* -------------------- Screen wrapper -------------------- */
const Screen: React.FC<React.PropsWithChildren> = ({ children }) => {
  const isLandscape = useIsLandscape();
  return (
    <ImageBackground source={bg} style={styles.bg} imageStyle={styles.bgImage}>
      <SafeAreaView style={styles.safe} edges={['top','left','right','bottom']}>
        <View
          style={[
            styles.container,
            isLandscape && styles.containerLandscape,
          ]}
        >
          {children}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

/* -------------------- Data helpers (SQLite) -------------------- */
async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // Single table holding every submission
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      q1 INTEGER NOT NULL,
      q2 INTEGER NOT NULL,
      q3 INTEGER NOT NULL,
      q4 INTEGER NOT NULL,
      q5 INTEGER NULL,          -- 1 = true, 0 = false, NULL = not answered
      feedback TEXT NOT NULL,
      service TEXT NOT NULL
    );
    -- Optional: index by date if you ever query by time
    CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
  `);
}

async function saveResponse(db: SQLiteDatabase, a: SurveyAnswers) {
  const q5val = a.q5 === null ? null : (a.q5 ? 1 : 0);
  await db.runAsync(
    `INSERT INTO responses (q1,q2,q3,q4,q5,feedback,service)
     VALUES (?,?,?,?,?,?,?)`,
    [a.q1, a.q2, a.q3, a.q4, q5val, a.feedback.trim(), a.service.trim()]
  );
}

async function exportCsv(db: SQLiteDatabase): Promise<string> {
  const rows = await db.getAllAsync<{
    id: number; created_at: string; q1: number; q2: number; q3: number; q4: number; q5: number | null; feedback: string; service: string;
  }>(`SELECT id, created_at, q1, q2, q3, q4, q5, feedback, service FROM responses ORDER BY id ASC`);

  const header = ["id","created_at","q1","q2","q3","q4","q5","feedback","service"];
  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  };

  const lines = [
    header.join(","),
    ...rows.map(r => [
      r.id,
      r.created_at,
      r.q1,
      r.q2,
      r.q3,
      r.q4,
      r.q5 === null ? "" : r.q5,
      r.feedback,
      r.service,
    ].map(escapeCsv).join(","))
  ];

  const csv = lines.join("\n");
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const fileUri = `${FileSystem.documentDirectory}responses-${stamp}.csv`;

  // ✅ Don’t pass an encoding object; default is UTF-8
  await FileSystem.writeAsStringAsync(fileUri, csv);

  // Share if available (mobile). On web, fall back to alert.
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Vie CSV" });
    } else {
      // Web / environments without Sharing
      Alert.alert("CSV luotu", `Tiedosto: ${fileUri}`);
    }
  } catch (e) {
    // If sharing fails, at least return the path
    console.warn("Sharing failed:", e);
  }

  return fileUri;
}

/* -------------------- Screens -------------------- */
type StartProps = NativeStackScreenProps<RootStackParamList, "Start">;
function StartScreen({ navigation }: StartProps) {
  return (
    <Screen>
      <Text style={styles.title}>HyMy-kylän palautekysely</Text>
      <Pressable style={styles.button} onPress={() => navigation.navigate("Q1")}>
        <Text style={styles.buttonText}>Aloita</Text>
      </Pressable>
    </Screen>
  );
}

type GenericStarQuestionProps = NativeStackScreenProps<RootStackParamList, "Q1" | "Q2" | "Q3" | "Q4">;
function GenericStarQuestion({ route, navigation }: GenericStarQuestionProps) {
  const { keyName, question, next } = route.params as QuestionRouteParams;
  const { answers, update } = useSurvey();

  return (
    <Screen>
      <Text style={styles.question}>{question}</Text>
      <RatingStars value={answers[keyName]} onChange={(v) => update({ [keyName]: v } as Partial<SurveyAnswers>)} />
      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>Takaisin</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { opacity: answers[keyName] ? 1 : 0.5 }]}
          disabled={!answers[keyName]}
          onPress={() => navigation.navigate(next)}
        >
          <Text style={styles.buttonText}>Seuraava</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type Q5Props = NativeStackScreenProps<RootStackParamList, "Q5">;
function Question5({ navigation }: Q5Props) {
  const { answers, update } = useSurvey();
  return (
    <Screen>
      <Text style={styles.question}>Haluatko antaa avointa palautetta?</Text>
      <YesNo value={answers.q5} onChange={(v) => update({ q5: v })} />
      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>Takaisin</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { opacity: answers.q5 !== null ? 1 : 0.5 }]}
          disabled={answers.q5 === null}
          onPress={() => navigation.navigate(answers.q5 ? "OpenFeedback" : "Service")}
        >
          <Text style={styles.buttonText}>Seuraava</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type OpenFeedbackProps = NativeStackScreenProps<RootStackParamList, "OpenFeedback">;
function OpenFeedback({ navigation }: OpenFeedbackProps) {
  const { answers, update } = useSurvey();
  return (
    <Screen>
      <Text style={styles.question}>Avoin palaute</Text>
      <TextInput
        placeholder="Kirjoita palaute..."
        value={answers.feedback}
        onChangeText={(t) => update({ feedback: t })}
        multiline
        style={styles.textarea}
      />
      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>Takaisin</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate("Service")}>
          <Text style={styles.buttonText}>Seuraava</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type ServiceProps = NativeStackScreenProps<RootStackParamList, "Service">;
function Service({ navigation }: ServiceProps) {
  const { answers, update } = useSurvey();
  const services = ["Valitse palvelu", "Apuvälinepalvelut", "Fysioterapiapalvelut", "Hoitajavastaanotto", "Jalkaterapiapalvelut",
    "KyläOPTIKKO -optikkopalvelut", "Ohjattu ryhmätoiminta", "Osteopatiapalvelut", "Perhevalmennus",
    "Senioripalvelut", "Suun terveydenhuollon palvelut", "Toimintaterapiapalvelut", "Muu"];

  const skipService = () => {
    // leave service as empty string to indicate non-disclosure
    update({ service: "" });
    navigation.navigate("Submit");
  };

  return (
    <Screen>
      <Text style={styles.question}>Käyttämäsi palvelu</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={answers.service || services[0]}
          onValueChange={(v: string) => update({ service: v === "Valitse palvelu" ? "" : v })}
        >
          {services.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      {/* Skip link/button for users who don't want to disclose */}
      <Pressable accessibilityRole="button" onPress={skipService} style={styles.textLink}>
        <Text style={styles.textLinkLabel}>En halua kertoa tätä</Text>
      </Pressable>

      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>Takaisin</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { opacity: answers.service ? 1 : 0.5 }]}
          disabled={!answers.service}
          onPress={() => navigation.navigate("Submit")}
        >
          <Text style={styles.buttonText}>Seuraava</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type SubmitProps = NativeStackScreenProps<RootStackParamList, "Submit">;
function SubmitScreen({ navigation }: SubmitProps) {
  const db = useSQLiteContext();
  const { answers, reset } = useSurvey();
  const savedRef = useRef(false);

  // Save exactly once when arriving on this screen
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (savedRef.current) return;
      try {
        await saveResponse(db, answers);
        savedRef.current = true;
      } catch (e: any) {
        if (!mounted) return;
        Alert.alert("Tallennus epäonnistui", e?.message ?? String(e));
      }
    })();
    return () => { mounted = false; };
  }, [db, answers]);

  const handleNew = () => {
    reset();
    navigation.popToTop();
  };

  const handleExport = async () => {
    try {
      const path = await exportCsv(db);
      if (Platform.OS === "web") {
        Alert.alert("CSV luotu", `Tiedosto: ${path}`);
      }
    } catch (e: any) {
      Alert.alert("CSV-vienti epäonnistui", e?.message ?? String(e));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Kiitos!</Text>
      <Text style={styles.question}>Palautteesi on vastaanotettu.</Text>

      <Pressable style={[styles.button, { marginTop: 24 }]} onPress={handleNew}>
        <Text style={styles.buttonText}>Uusi vastaus</Text>
      </Pressable>

      {/* Simple admin/export control */}
      <Pressable style={[styles.secondary, { alignSelf: "center", marginTop: 12 }]} onPress={handleExport}>
        <Text>Vie kaikki vastaukset CSV:ksi</Text>
      </Pressable>
    </Screen>
  );
}

/* -------------------- Nav Mount -------------------- */
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Provide SQLite at the top level and run migrations once */}
      <SQLiteProvider databaseName="feedback.db" onInit={migrateDbIfNeeded}>
        <SurveyProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Start" component={StartScreen} options={{ title: "Aloitus" }} />
              <Stack.Screen
                name="Q1"
                component={GenericStarQuestion}
                options={{ title: "Kysymys 1" }}
                initialParams={{ keyName: "q1", question: "Palvelut olivat helposti saatavilla", next: "Q2" }}
              />
              <Stack.Screen
                name="Q2"
                component={GenericStarQuestion}
                options={{ title: "Kysymys 2" }}
                initialParams={{ keyName: "q2", question: "Palvelukokemus oli mielestäni viihtyisä ja sujuva", next: "Q3" }}
              />
              <Stack.Screen
                name="Q3"
                component={GenericStarQuestion}
                options={{ title: "Kysymys 3" }}
                initialParams={{ keyName: "q3", question: "Koen saaneeni tukea tai tarvittaessa ohjausta", next: "Q4" }}
              />
              <Stack.Screen
                name="Q4"
                component={GenericStarQuestion}
                options={{ title: "Kysymys 4" }}
                initialParams={{ keyName: "q4", question: "Haluaisin tulla uudelleen / suosittelen palvelua muille", next: "Q5" }}
              />
              <Stack.Screen name="Q5" component={Question5} options={{ title: "Kysymys 5" }} />
              <Stack.Screen name="OpenFeedback" component={OpenFeedback} options={{ title: "Avoin palaute" }} />
              <Stack.Screen name="Service" component={Service} options={{ title: "Palvelu" }} />
              <Stack.Screen name="Submit" component={SubmitScreen} options={{ title: "Kiitos" }} />
            </Stack.Navigator>
          </NavigationContainer>
        </SurveyProvider>
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
  containerLandscape: {
    paddingHorizontal: 40,
  },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  question: { fontSize: 18, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  button: { backgroundColor: "#ff5000", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#d0d0d0", backgroundColor: "#fff" },
  navRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  star: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: "#d0d0d0", backgroundColor: "#fff" },
  starActive: { backgroundColor: "#fffddbff", borderColor: "#fff000" },
  starText: { fontSize: 22, color: "#aaaaaa" },
  starTextActive: { color: "#fff000" },
  pill: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: "#d0d0d0", backgroundColor: "#fff"},
  pillActive: { backgroundColor: "#8ceba5", borderColor: "#8ceba5" },
  pillText: { fontWeight: "600" },
  pillTextActive: { color: "#0a8f2a" },
  pillActive2: { backgroundColor: "#babbbd", borderColor: "#babbbd" },
  pillTextActive2: { color: "#505050ff" },
  textarea: { minHeight: 140, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, textAlignVertical: "top", backgroundColor: "#ffffffff" },
  pickerWrap: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, overflow: "hidden", backgroundColor: "#ffffffff" },
  textLink: { alignSelf: "center", marginTop: 8, padding: 6 },
  textLinkLabel: { textDecorationLine: "underline", color: "#4b5563", fontWeight: "600" },
});
