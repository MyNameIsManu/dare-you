import { supabase } from "@/../utils/supabase";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n } from "@/i18n";
import { Colors } from "@/constants/theme";

type Mode = "signIn" | "signUp";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export default function SignInScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("signIn");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignUp = mode === "signUp";

  async function handleSubmit() {
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError(t("auth.missingCredentials"));
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const cleanUsername = username.trim().toLowerCase();

      if (!displayName.trim()) {
        setError(t("auth.missingDisplayName"));
        setLoading(false);
        return;
      }
      if (!USERNAME_PATTERN.test(cleanUsername)) {
        setError(t("auth.invalidUsername"));
        setLoading(false);
        return;
      }

      const { data: available, error: checkError } = await supabase.rpc(
        "is_username_available",
        { name: cleanUsername },
      );
      if (checkError) {
        setError(checkError.message);
        setLoading(false);
        return;
      }
      if (!available) {
        setError(t("auth.usernameTaken"));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        // Read by the database trigger that creates the profile
        options: {
          data: { display_name: displayName.trim(), username: cleanUsername },
        },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo(t("auth.confirmEmail"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setError(error.message);
    }

    // On success there is now a session, and the root layout switches to the app automatically
    setLoading(false);
  }

  function switchMode() {
    setMode(isSignUp ? "signIn" : "signUp");
    setError(null);
    setInfo(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.title}>DareYou</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? t("auth.createAccount") : t("auth.welcomeBack")}
        </Text>

        <View style={styles.form}>
          {isSignUp && (
            <>
              <TextInput
                style={styles.input}
                placeholder={t("auth.displayName")}
                value={displayName}
                onChangeText={setDisplayName}
                autoComplete="name"
                textContentType="name"
              />
              <TextInput
                style={styles.input}
                placeholder={t("auth.username")}
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username-new"
                textContentType="username"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <TextInput
            style={styles.input}
            placeholder={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? "new-password" : "current-password"}
            textContentType={isSignUp ? "newPassword" : "password"}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (pressed || loading) && styles.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.onAccent} />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? t("auth.signUp") : t("auth.signIn")}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={switchMode} disabled={loading}>
            <Text style={styles.switchText}>
              {isSignUp ? t("auth.switchToSignIn") : t("auth.switchToSignUp")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 36, fontWeight: "800", textAlign: "center" },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: Colors.light.danger },
  info: { color: Colors.light.success },
  button: {
    backgroundColor: Colors.light.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: Colors.light.onAccent, fontSize: 16, fontWeight: "600" },
  switchText: {
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
});
