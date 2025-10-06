import React, { createContext, useContext, useState, PropsWithChildren } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

/* -------------------- Types -------------------- */
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

/* -------------------- Survey State -------------------- */
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

  return (
    <SurveyContext.Provider value={{ answers, update }}>
      {children}
    </SurveyContext.Provider>
  );
}

/* -------------------- UI Bits -------------------- */
interface RatingStarsProps {
  value: number;
  onChange: (v: number) => void;
}
function RatingStars({ value, onChange }: RatingStarsProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
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

interface YesNoProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
}
function YesNo({ value, onChange }: YesNoProps) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Pressable
        onPress={() => onChange(true)}
        style={[styles.pill, value === true && styles.pillActive]}
      >
        <Text style={[styles.pillText, value === true && styles.pillTextActive]}>Kyllä</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(false)}
        style={[styles.pill, value === false && styles.pillActive]}
      >
        <Text style={[styles.pillText, value === false && styles.pillTextActive]}>Ei</Text>
      </Pressable>
    </View>
  );
}

/* Small wrapper to apply safe-area consistently */
const Screen: React.FC<React.PropsWithChildren> = ({ children }) => (
  <SafeAreaView style={styles.container} edges={['top','left','right','bottom']}>
    {children}
  </SafeAreaView>
);

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

type GenericStarQuestionProps = NativeStackScreenProps<
  RootStackParamList,
  "Q1" | "Q2" | "Q3" | "Q4"
>;
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
  const services = ["Valitse...", "Neuvola", "Opetus", "Nuorisopalvelut", "Sote"];

  return (
    <Screen>
      <Text style={styles.question}>Käyttämäsi palvelu</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={answers.service || services[0]}
          onValueChange={(v: string) => update({ service: v === "Valitse..." ? "" : v })}
        >
          {services.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      <View style={styles.navRow}>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text>Takaisin</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { opacity: answers.service ? 1 : 0.5 }]}
          disabled={!answers.service}
          onPress={() => navigation.navigate("Submit")}
        >
          <Text style={styles.buttonText}>Lähetä</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type SubmitProps = NativeStackScreenProps<RootStackParamList, "Submit">;
function SubmitScreen({ navigation }: SubmitProps) {
  // Here you’d POST `answers` to your backend.
  return (
    <Screen>
      <Text style={styles.title}>Kiitos!</Text>
      <Text style={{ marginTop: 8 }}>Palautteesi on vastaanotettu.</Text>
      <Pressable style={[styles.secondary, { marginTop: 24 }]} onPress={() => navigation.popToTop()}>
        <Text>Uusi vastaus</Text>
      </Pressable>
    </Screen>
  );
}

/* -------------------- Nav Mount -------------------- */
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <SurveyProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Start" component={StartScreen} options={{ title: "Aloitus" }} />
            <Stack.Screen
              name="Q1"
              component={GenericStarQuestion}
              options={{ title: "Kysymys 1" }}
              initialParams={{
                keyName: "q1",
                question: "Palvelut olivat helposti saatavilla",
                next: "Q2",
              }}
            />
            <Stack.Screen
              name="Q2"
              component={GenericStarQuestion}
              options={{ title: "Kysymys 2" }}
              initialParams={{
                keyName: "q2",
                question: "Palvelukokemus oli mielestäni viihtyisä ja sujuva",
                next: "Q3",
              }}
            />
            <Stack.Screen
              name="Q3"
              component={GenericStarQuestion}
              options={{ title: "Kysymys 3" }}
              initialParams={{
                keyName: "q3",
                question: "Koen saaneeni tukea tai tarvittaessa ohjausta",
                next: "Q4",
              }}
            />
            <Stack.Screen
              name="Q4"
              component={GenericStarQuestion}
              options={{ title: "Kysymys 4" }}
              initialParams={{
                keyName: "q4",
                question: "Haluaisin tulla uudelleen / suosittelen palvelua muille",
                next: "Q5",
              }}
            />
            <Stack.Screen name="Q5" component={Question5} options={{ title: "Kysymys 5" }} />
            <Stack.Screen name="OpenFeedback" component={OpenFeedback} options={{ title: "Avoin palaute" }} />
            <Stack.Screen name="Service" component={Service} options={{ title: "Palvelu" }} />
            <Stack.Screen name="Submit" component={SubmitScreen} options={{ title: "Kiitos" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SurveyProvider>
    </SafeAreaProvider>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  question: { fontSize: 18, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  button: { backgroundColor: "#5b7cff", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#d0d0d0", backgroundColor: "#fff" },
  navRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  star: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#e1e1e1", alignItems: "center", justifyContent: "center" },
  starActive: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  starText: { fontSize: 22, color: "#aaaaaa" },
  starTextActive: { color: "#3b82f6" },
  pill: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: "#d0d0d0" },
  pillActive: { backgroundColor: "#eaffea", borderColor: "#a8e6a8" },
  pillText: { fontWeight: "600" },
  pillTextActive: { color: "#0a8f2a" },
  textarea: { minHeight: 140, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, textAlignVertical: "top" },
  pickerWrap: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, overflow: "hidden" },
});
