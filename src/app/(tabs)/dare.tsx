import { getMyDares, type MyDares } from "@/../utils/dares";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DareCard } from "@/components/dare-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WebBadge } from "@/components/web-badge";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** How long the "just created" highlight stays before the URL param is cleared. */
const HIGHLIGHT_MS = 3000;

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

  const [dares, setDares] = useState<MyDares | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setDares(await getMyDares());
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Dares konnten nicht geladen werden",
      );
    }
  }, []);

  // Reload every time the tab is shown, so new dares appear right away
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
              <ThemedView style={styles.section}>
                <ThemedText type="subtitle">Offene Dares</ThemedText>
                {dares.open.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Du hast keine offenen Dares.
                  </ThemedText>
                ) : (
                  dares.open.map((dare) => (
                    <DareCard
                      key={dare.id}
                      dare={dare}
                      highlight={dare.id === highlightId}
                    />
                  ))
                )}
              </ThemedView>

              <ThemedView style={styles.section}>
                <ThemedText type="subtitle">Erledigte Dares</ThemedText>
                {dares.done.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Du hast noch keine abgeschlossenen Dares.
                  </ThemedText>
                ) : (
                  dares.done.map((dare) => (
                    <DareCard key={dare.id} dare={dare} />
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
  loading: {
    marginTop: Spacing.six,
  },
  error: {
    color: "#c62828",
    textAlign: "center",
    marginTop: Spacing.four,
  },
});
