import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/../utils/auth-context";
import { dareProgress } from "@/../utils/dare-progress";
import { personName, type Dare } from "@/../utils/dares";
import { useDares } from "@/../utils/dares-context";
import { DareProgressRow } from "@/components/dare-progress-row";
import { DeadlineRing } from "@/components/deadline-ring";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useNow } from "@/hooks/use-now";
import { useTheme } from "@/hooks/use-theme";

function openDare(dare: Dare) {
  router.push({ pathname: "/dares/[id]", params: { id: String(dare.id) } });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const now = useNow();
  const { session } = useAuth();
  const myId = session?.user.id;
  const { dares, error, reload } = useDares();
  const [refreshing, setRefreshing] = useState(false);

  // Only dares *I* have to do (soonest deadline first, see getMyDares)
  const mine = dares?.open.filter((d) => d.assignee_id === myId) ?? [];
  const running = mine.filter((d) => d.status === "open");
  const inReview = mine.length - running.length;
  const next = running[0];
  const invitations = dares?.invitations.length ?? 0;

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  // Web: the tab bar floats over the top. Native: notch + bottom tab bar.
  const platformPadding = Platform.select({
    web: {
      paddingTop: Spacing.six + Spacing.four,
      paddingBottom: Spacing.four,
    },
    default: {
      paddingTop: insets.top + Spacing.three,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
    },
  });

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, platformPadding]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <View style={styles.container}>
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {/* Invitations live on the Dares tab; just point there */}
        {invitations > 0 && (
          <Pressable
            onPress={() => router.push("/dare")}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="smallBold">
                {invitations === 1
                  ? "1 neue Herausforderung wartet auf dich"
                  : `${invitations} neue Herausforderungen warten auf dich`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ansehen ›
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}

        {!dares ? (
          !error && <ActivityIndicator style={styles.loading} />
        ) : mine.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="subtitle" style={styles.center}>
              Alles erledigt
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Du hast gerade keine offenen Dares.
            </ThemedText>
            <Pressable
              onPress={() => router.push("/create")}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundSelected" style={styles.button}>
                <ThemedText type="smallBold">Neuen Dare erstellen</ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        ) : (
          <>
            {/* The dare with the closest deadline, big */}
            {next && (
              <Pressable
                onPress={() => openDare(next)}
                style={({ pressed }) => [
                  styles.hero,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  Als Nächstes fällig
                </ThemedText>
                <DeadlineRing progress={dareProgress(next, now)} />
                <View style={styles.heroText}>
                  <ThemedText
                    type="default"
                    style={[styles.center, styles.heroTitle]}
                    numberOfLines={2}
                  >
                    {next.title}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.center}
                  >
                    {next.creator_id === myId
                      ? "Eigener Dare"
                      : `von ${personName(next.creator)}`}
                    {" · "}
                    {Math.round(dareProgress(next, now).elapsed * 100)} % der
                    Zeit vorbei
                  </ThemedText>
                </View>
              </Pressable>
            )}

            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.center}
            >
              {running.length} offen
              {inReview > 0 && ` · ${inReview} in Prüfung`}
            </ThemedText>

            <View style={styles.list}>
              <ThemedText type="smallBold" style={styles.listTitle}>
                Deine Dares
              </ThemedText>
              {mine.map((dare) => (
                <DareProgressRow
                  key={dare.id}
                  dare={dare}
                  now={now}
                  onPress={() => openDare(dare)}
                />
              ))}
            </View>
          </>
        )}

        <View style={styles.account}>
          {session?.user.email && (
            <ThemedText type="small" themeColor="textSecondary">
              Angemeldet als {session.user.email}
            </ThemedText>
          )}
          <SignOutButton />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: Math.min(560, MaxContentWidth),
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  center: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: "#c62828",
    textAlign: "center",
  },
  loading: {
    marginTop: Spacing.six,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  empty: {
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.six,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  hero: {
    alignItems: "center",
    gap: Spacing.three,
  },
  heroText: {
    alignItems: "center",
    gap: Spacing.half,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 600,
  },
  list: {
    gap: Spacing.two,
  },
  listTitle: {
    marginBottom: Spacing.one,
  },
  account: {
    marginTop: "auto",
    paddingTop: Spacing.five,
    alignItems: "center",
    gap: Spacing.two,
  },
});
