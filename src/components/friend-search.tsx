import {
  getFriendLists,
  searchUsers,
  sendFriendRequest,
  type FriendLists as Lists,
  type PublicProfile,
} from "@/../utils/friends";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  FriendLists,
  GlassList,
  relationTo,
  StatusPill,
} from "@/components/friend-lists";
import { glassSurface } from "@/components/glass-card";
import { ActionButton, ProfileRow } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

type SendStatus = Awaited<ReturnType<typeof sendFriendRequest>>;
/** Result of tapping "Add": a status (translated when shown) or an error message */
type SendResult = { status: SendStatus } | { error: string };

export function FriendSearch() {
  const theme = useTheme();
  const { t } = useI18n(); // re-renders on language change; use this t (the compiler caches the global one)
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-user feedback after tapping "Add", keyed by profile id
  // My friend lists, to show who is already a friend in the results
  const [lists, setLists] = useState<Lists | null>(null);
  const loadLists = useCallback(() => {
    getFriendLists()
      .then(setLists)
      .catch(() => setLists(null));
  }, []);
  useFocusEffect(loadLists);

  const [sent, setSent] = useState<Record<string, SendResult>>({});

  const isSearching = query.trim().length >= 2;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    // Wait until the user pauses typing for 300 ms before searching
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchUsers(q);
        if (!cancelled) {
          setResults(found);
          setError(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : t("friends.searchFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    // A new keystroke cancels the pending search and ignores late results
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, t]);

  async function handleAdd(profile: PublicProfile) {
    if (!profile.username) return;
    try {
      const status = await sendFriendRequest(profile.username);
      setSent((prev) => ({ ...prev, [profile.id]: { status } }));
    } catch (e) {
      setSent((prev) => ({
        ...prev,
        [profile.id]: {
          error:
            e instanceof Error ? e.message : t("common.somethingWentWrong"),
        },
      }));
    }
  }

  function sendResultText(result: SendResult) {
    return "status" in result
      ? t(`friends.sendStatus.${result.status}`)
      : result.error;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchBar,
          glassSurface(theme),
          { borderColor: focused ? theme.text : theme.glassBorder },
          focused && styles.searchFocused,
        ]}
      >
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t("friends.searchPlaceholder")}
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" />}
      </View>

      {/* Empty search field: show my friends and requests instead */}
      {!isSearching ? (
        <FriendLists />
      ) : (
        <>
          {error && <Text style={styles.error}>{error}</Text>}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.results}
          >
            {results.length === 0 && !loading && !error ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {t("friends.noUsers")}
              </ThemedText>
            ) : (
              <GlassList>
                {results.map((item, i) => {
                  const relation = lists ? relationTo(lists, item.id) : "none";
                  return (
                    <ProfileRow
                      key={item.id}
                      card
                      last={i === results.length - 1}
                      profile={item}
                      right={
                        sent[item.id] ? (
                          <StatusPill text={sendResultText(sent[item.id])} />
                        ) : relation === "none" ? (
                          <ActionButton
                            label={t("friends.add")}
                            onPress={() => handleAdd(item)}
                          />
                        ) : (
                          <StatusPill text={t(`profile.status.${relation}`)} />
                        )
                      }
                    />
                  );
                })}
              </GlassList>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    height: 52,
    paddingHorizontal: Spacing.three + 1,
    borderRadius: 26,
    borderWidth: 1,
  },
  searchFocused: { borderWidth: 2 },
  results: { paddingTop: Spacing.three, paddingBottom: Spacing.four },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    // Hide the browser's default focus ring; the bar's border shows focus instead
    ...({ outlineStyle: "none" } as object),
  },
  error: { color: Colors.light.danger, marginTop: 8 },
  empty: { textAlign: "center", marginTop: 24 },
});
