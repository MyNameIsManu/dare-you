import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";

import { supabase } from "@/../utils/supabase";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Signs the user out of Supabase. The root layout's Stack.Protected guard
 * then switches to the sign-in screen automatically.
 */
export function SignOutButton() {
  const theme = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    // On success this component unmounts (we leave the tabs), so only reset on error.
    if (error) {
      setIsSigningOut(false);
      Alert.alert("Abmelden fehlgeschlagen", error.message);
    }
  }

  function confirmSignOut() {
    // Alert with buttons isn't supported on web — sign out directly there.
    if (Platform.OS === "web") return signOut();

    Alert.alert("Abmelden?", "Du kannst dich jederzeit wieder anmelden.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Abmelden", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
      disabled={isSigningOut}
      onPress={confirmSignOut}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      {isSigningOut ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <ThemedText type="smallBold" style={styles.label}>
          Abmelden
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 140,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  label: {
    color: "#E5484D",
  },
  pressed: {
    opacity: 0.7,
  },
});
