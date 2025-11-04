import React, {
  createContext,
  useContext,
  useState,
  PropsWithChildren,
} from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  ImageBackground,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  NavigationContainer,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const bg = require("./assets/bg.png");

/* -------------------- Language setup -------------------- */
type LangCode = "fi" | "en" | "sv";

const translations = {
  fi: {
    startTitle: "HyMy-kylän palautekysely",
    startButton: "Aloita",
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
    received: "Palautteesi on vastaanotettu.",
    new: "Uusi vastaus",
    chooseService: "Valitse palvelu",
  },
  en: {
    startTitle: "HyMy-kylä feedback survey",
    startButton: "Start",
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
    received: "Your feedback has been received.",
    new: "New response",
    chooseService: "Select service",
  },
  sv: {
    startTitle: "HyMy-kylä feedbackenkät",
    startButton: "Börja",
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
    received: "Din feedback har mottagits.",
    new: "Nytt svar",
    chooseService: "Välj tjänst",
  },
} as const;

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: keyof typeof translations["fi"]) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be inside LanguageProvider");
  return ctx;
};

function LanguageProvider({ children }: PropsWithChildren) {
  const [lang, setLang] = useState<LangCode>("fi");
  const t = (key: keyof typeof translations["fi"]) => translations[lang][key];
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/* -------------------- Survey Context -------------------- */
type StarKeys = "q1" | "q2" | "q3" | "q4";

interface SurveyAnswers {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: boolean | null;
  feedback: string;
  service: string;
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

interface SurveyContextValue {
  answers: SurveyAnswers;
  update: (patch: Partial<SurveyAnswers>) => void;
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
  return (
    <SurveyContext.Provider value={{ answers, update }}>
      {children}
    </SurveyContext.Provider>
  );
}

/* -------------------- Orientation helper -------------------- */
function useIsLandscape() {
  const { width, height } = useWindowDimensions();
  return width > height;
}

/* -------------------- Shared Components -------------------- */
function LanguagePicker() {
  const { lang, setLang } = useLang();
  return (
    <View style={{ alignSelf: "center", marginVertical: 8 }}>
      <Picker
        selectedValue={lang}
        onValueChange={(v) => setLang(v as LangCode)}
        style={{ width: 200 }}
      >
        <Picker.Item label="🇫🇮 Suomi" value="fi" />
        <Picker.Item label="🇬🇧 English" value="en" />
        <Picker.Item label="🇸🇪 Svenska" value="sv" />
      </Picker>
    </View>
  );
}

const Screen: React.FC<React.PropsWithChildren> = ({ children }) => {
  const isLandscape = useIsLandscape();
  return (
    <ImageBackground source={bg} style={styles.bg} imageStyle={styles.bgImage}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
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

interface RatingStarsProps { value: number; onChange: (v: number) => void; }
function RatingStars({ value, onChange }: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: "row", gap: 8, alignSelf: "center" }}>
      {stars.map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
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
  const { t } = useLang();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignSelf: "center" }}>
      <Pressable
        onPress={() => onChange(true)}
        style={[styles.pill, value === true && styles.pillActive]}
      >
        <Text style={[styles.pillText, value === true && styles.pillTextActive]}>
          {t("yes")}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(false)}
        style={[styles.pill, value === false && styles.pillActive2]}
      >
        <Text style={[styles.pillText, value === false && styles.pillTextActive2]}>
          {t("no")}
        </Text>
      </Pressable>
    </View>
  );
}

/* -------------------- Screens -------------------- */
function StartScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Start">) {
  const { t } = useLang();
  return (
    <Screen>
      <LanguagePicker />
      <Text style={styles.title}>{t("startTitle")}</Text>
      <Pressable
        style={styles.button}
        onPress={() =>
          navigation.navigate("Q1", {
            keyName: "q1",
            question: t("q1"),
            next: "Q2",
          })
        }
      >
        <Text style={styles.buttonText}>{t("startButton")}</Text>
      </Pressable>
    </Screen>
  );
}

function GenericStarQuestion({ route, navigation }: any) {
  const { keyName, next } = route.params as QuestionRouteParams;
  const { t } = useLang();
  const { answers, update } = useSurvey();
  return (
    <Screen>
      <Text style={styles.question}>{t(keyName)}</Text>
      <RatingStars
        value={answers[keyName]}
        onChange={(v) => update({ [keyName]: v } as Partial<SurveyAnswers>)}
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

function Question5({ navigation }: any) {
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
          style={[styles.button, { opacity: answers.q5 !== null ? 1 : 0.5 }]}
          disabled={answers.q5 === null}
          onPress={() => navigation.navigate(answers.q5 ? "OpenFeedback" : "Service")}
        >
          <Text style={styles.buttonText}>{t("next")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function OpenFeedback({ navigation }: any) {
  const { t } = useLang();
  const { answers, update } = useSurvey();
  return (
    <Screen>
      <Text style={styles.question}>{t("openFeedback")}</Text>
      <TextInput
        placeholder={t("placeholder")}
        value={answers.feedback}
        onChangeText={(t) => update({ feedback: t })}
        multiline
        style={styles.textarea}
      />
      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>{t("back")}</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate("Service")}>
          <Text style={styles.buttonText}>{t("next")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Service({ navigation }: any) {
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
          onValueChange={(v: string) => update({ service: v === services[0] ? "" : v })}
        >
          {services.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>
      <Pressable onPress={skipService} style={styles.textLink}>
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

function SubmitScreen({ navigation }: any) {
  const { t } = useLang();
  return (
    <Screen>
      <Text style={styles.title}>{t("thanks")}</Text>
      <Text style={styles.question}>{t("received")}</Text>
      <Pressable
        style={[styles.button, { marginTop: 24 }]}
        onPress={() => navigation.popToTop()}
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
      <LanguageProvider>
        <SurveyProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Start" component={StartScreen} />
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
              <Stack.Screen name="OpenFeedback" component={OpenFeedback} />
              <Stack.Screen name="Service" component={Service} />
              <Stack.Screen name="Submit" component={SubmitScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SurveyProvider>
      </LanguageProvider>
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
  question: { fontSize: 18, fontWeight: "600", marginBottom: 8, textAlign: "center" },
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
  navRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
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
  starActive: { backgroundColor: "#fffddb", borderColor: "#fff000" },
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
  pillTextActive2: { color: "#505050" },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  textLink: { alignSelf: "center", marginTop: 8, padding: 6 },
  textLinkLabel: { textDecorationLine: "underline", color: "#4b5563", fontWeight: "600" },
});
