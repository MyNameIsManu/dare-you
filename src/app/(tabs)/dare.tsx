import { useAuth } from "@/../utils/auth-context";
import {
  personName,
  respondToDare,
  withdrawDare,
  type Dare,
} from "@/../utils/dares";
import { useDares } from "@/../utils/dares-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DareCard } from "@/components/dare-card";
import { ActionButton } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WebBadge } from "@/components/web-badge";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** How long the "just created" highlight stays before the URL param is cleared. */
const HIGHLIGHT_MS = 3000;

/** Ask before a destructive action (native dialog, browser confirm on web). */
function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Abbrechen", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export default function DareScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  // Set by the Create tab after saving: /dare?highlight=<id>
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const highlightId = highlight ? Number(highlight) : null;

  const { session } = useAuth();
  const myId = session?.user.id;

  // Shared, live-updated lists (see utils/dares-context.tsx)
  const { dares, error: loadError, reload: load } = useDares();
  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? loadError;
  const [refreshing, setRefreshing] = useState(false);
  // Dare whose button is currently working (disables the other buttons)
  const [busyId, setBusyId] = useState<number | null>(null);
  // Dare that was just accepted: glows once in "Offene Dares"
  const [acceptedId, setAcceptedId] = useState<number | null>(null);

  // Also reload when the tab is shown (a fallback if Realtime is unavailable)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Clear the param afterwards, so the dare doesn't glow again on the next visit
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(
      () => router.setParams({ highlight: undefined }),
      HIGHLIGHT_MS,
    );
    return () => clearTimeout(timer);
  }, [highlight]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  /** Runs a dare action, then reloads the lists. */
  async function run(dare: Dare, action: () => Promise<unknown>) {
    setBusyId(dare.id);
    setActionError(null);
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Etwas ist schiefgelaufen",
      );
      await load(); // e.g. the other person already answered
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function accept(dare: Dare) {
    if (await run(dare, () => respondToDare(dare.id, true))) {
      setAcceptedId(dare.id);
      setTimeout(() => setAcceptedId(null), HIGHLIGHT_MS);
    }
  }

  function decline(dare: Dare) {
    confirm(
      "Dare ablehnen?",
      `${personName(dare.creator)} sieht, dass du abgelehnt hast.`,
      "Ablehnen",
      () => run(dare, () => respondToDare(dare.id, false)),
    );
  }

  function withdraw(dare: Dare) {
    confirm(
      "Dare zurückziehen?",
      `Der Dare an ${personName(dare.assignee)} wird gelöscht.`,
      "Zurückziehen",
      () => run(dare, () => withdrawDare(dare.id)),
    );
  }

  function openDare(dare: Dare) {
    router.push({ pathname: "/dares/[id]", params: { id: String(dare.id) } });
  }

  /** "An Max" / "Von Max" for dares between two people, nothing for your own. */
  function otherPerson(dare: Dare) {
    if (dare.creator_id === dare.assignee_id) return undefined;
    return dare.creator_id === myId
      ? `An ${personName(dare.assignee)}`
      : `Von ${personName(dare.creator)}`;
  }

  const isBusy = (dare: Dare) => busyId === dare.id;
  const isLocked = (dare: Dare) => busyId !== null && busyId !== dare.id;

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <ThemedView style={styles.container}>
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          {!dares ? (
            !error && <ActivityIndicator style={styles.loading} />
          ) : (
            <>
              {/* Dares friends sent me: accept or decline */}
              {dares.invitations.length > 0 && (
                <ThemedView style={styles.section}>
                  <ThemedText type="subtitle" style={styles.center}>
                    Herausforderungen an dich
                  </ThemedText>
                  {dares.invitations.map((dare) => (
                    <DareCard
                      onPress={() => openDare(dare)}
                      key={dare.id}
                      dare={dare}
                      subtitle={`Von ${personName(dare.creator)}`}
                      actions={
                        <>
                          <ActionButton
                            label="Ablehnen"
                            variant="secondary"
                            disabled={isBusy(dare) || isLocked(dare)}
                            onPress={() => decline(dare)}
                          />
                          <ActionButton
                            label="Annehmen"
                            busy={isBusy(dare)}
                            disabled={isLocked(dare)}
                            onPress={() => accept(dare)}
                          />
                        </>
                      }
                    />
                  ))}
                </ThemedView>
              )}

              {/* Proof from a friend for a dare I created: I decide */}
              {dares.toReview.length > 0 && (
                <ThemedView style={styles.section}>
                  <ThemedText type="subtitle">Zu prüfen</ThemedText>
                  {dares.toReview.map((dare) => (
                    <DareCard
                      key={dare.id}
                      dare={dare}
                      subtitle={`Beweis von ${personName(dare.assignee)}`}
                      onPress={() => openDare(dare)}
                      actions={
                        <ActionButton
                          label="Ansehen"
                          onPress={() => openDare(dare)}
                        />
                      }
                    />
                  ))}
                </ThemedView>
              )}

              <ThemedView style={styles.section}>
                <ThemedText type="subtitle">Offene Dares</ThemedText>
                {dares.open.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Du hast keine offenen Dares.
                  </ThemedText>
                ) : (
                  dares.open.map((dare) => (
                    <DareCard
                      onPress={() => openDare(dare)}
                      key={dare.id}
                      dare={dare}
                      subtitle={otherPerson(dare)}
                      highlight={
                        dare.id === highlightId || dare.id === acceptedId
                      }
                    />
                  ))
                )}
              </ThemedView>

              {/* Dares I sent to friends that they haven't answered yet */}
              {dares.sent.length > 0 && (
                <ThemedView style={styles.section}>
                  <ThemedText type="subtitle">Wartet auf Antwort</ThemedText>
                  {dares.sent.map((dare) => (
                    <DareCard
                      onPress={() => openDare(dare)}
                      key={dare.id}
                      dare={dare}
                      subtitle={`An ${personName(dare.assignee)}`}
                      highlight={dare.id === highlightId}
                      actions={
                        <ActionButton
                          label="Zurückziehen"
                          variant="danger"
                          busy={isBusy(dare)}
                          disabled={isLocked(dare)}
                          onPress={() => withdraw(dare)}
                        />
                      }
                    />
                  ))}
                </ThemedView>
              )}

              <ThemedView style={styles.section}>
                <ThemedText type="subtitle">Erledigte Dares</ThemedText>
                {dares.done.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Du hast noch keine abgeschlossenen Dares.
                  </ThemedText>
                ) : (
                  dares.done.map((dare) => (
                    <DareCard
                      onPress={() => openDare(dare)}
                      key={dare.id}
                      dare={dare}
                      subtitle={otherPerson(dare)}
                    />
                  ))
                )}
              </ThemedView>
            </>
          )}

          {Platform.OS === "web" && <WebBadge />}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
  },
  section: {
    gap: Spacing.three,
    alignItems: "center",
    paddingVertical: Spacing.five,
  },
  center: {
    textAlign: "center",
  },
  loading: {
    marginTop: Spacing.six,
  },
  error: {
    color: "#c62828",
    textAlign: "center",
    marginTop: Spacing.four,
  },
});
