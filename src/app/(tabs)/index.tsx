import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/../utils/auth-context";
import { AnimatedIcon } from "@/components/animated-icon";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

export default function HomeScreen() {
  const { session } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Was steht an?
          </ThemedText>
          <ThemedText type="smallBold" style={styles.title}>
            Du hast keine offenen Tasks.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.accountSection}>
          {session?.user.email && (
            <ThemedText type="small" themeColor="textSecondary">
              Angemeldet als {session.user.email}
            </ThemedText>
          )}
          <SignOutButton />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: "center",
  },
  accountSection: {
    alignItems: "center",
    gap: Spacing.two,
  },
  code: {
    textTransform: "uppercase",
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
