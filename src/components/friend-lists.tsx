import {
  acceptFriendRequest,
  getFriendLists,
  removeFriendship,
  type FriendLists as Lists,
  type FriendshipEntry,
} from "@/../utils/friends";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
} from "react-native";

import { ActionButton, ProfileRow } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

type SectionKey = "incoming" | "friends" | "outgoing";

const TITLES: Record<SectionKey, string> = {
  incoming: "Freundschaftsanfragen",
  friends: "Freunde",
  outgoing: "Gesendete Anfragen",
};

/** My friends, requests I received, and requests I sent. */
export function FriendLists() {
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Friendship id whose button is currently working
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLists(await getFriendLists());
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Freunde konnten nicht geladen werden",
      );
    }
  }, []);

  // Reload whenever the tab comes back into view (e.g. after a profile screen)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function run(
    entry: FriendshipEntry,
    action: (id: number) => Promise<void>,
  ) {
    setBusyId(entry.friendshipId);
    try {
      await action(entry.friendshipId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Etwas ist schiefgelaufen");
    } finally {
      setBusyId(null);
    }
  }

  if (!lists) {
    return error ? (
      <ThemedText style={styles.error}>{error}</ThemedText>
    ) : (
      <ActivityIndicator style={styles.loading} />
    );
  }

  // Hide empty request sections; always show "Freunde" so the empty hint has a home
  const sections = (["incoming", "friends", "outgoing"] as const)
    .filter((key) => key === "friends" || lists[key].length > 0)
    .map((key) => ({ key, title: TITLES[key], data: lists[key] }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.friendshipId)}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
      ListHeaderComponent={
        error ? (
          <ThemedText style={styles.error}>{error}</ThemedText>
        ) : undefined
      }
      renderSectionHeader={({ section }) => (
        <ThemedText
          type="smallBold"
          themeColor="textSecondary"
          style={styles.header}
        >
          {section.title.toUpperCase()} · {section.data.length}
        </ThemedText>
      )}
      renderSectionFooter={({ section }) =>
        section.key === "friends" && section.data.length === 0 ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.empty}
          >
            Noch keine Freunde. Suche oben nach einem Nutzernamen, um jemanden
            hinzuzufügen.
          </ThemedText>
        ) : null
      }
      renderItem={({ item, section }) => {
        const busy = busyId === item.friendshipId;
        const disabled = busyId !== null && !busy;

        if (section.key === "incoming") {
          return (
            <ProfileRow
              profile={item.profile}
              right={
                <>
                  <ActionButton
                    label="Ablehnen"
                    variant="secondary"
                    disabled={busy || disabled}
                    onPress={() => run(item, removeFriendship)}
                  />
                  <ActionButton
                    label="Annehmen"
                    busy={busy}
                    disabled={disabled}
                    onPress={() => run(item, acceptFriendRequest)}
                  />
                </>
              }
            />
          );
        }

        if (section.key === "outgoing") {
          return (
            <ProfileRow
              profile={item.profile}
              right={
                <ActionButton
                  label="Zurückziehen"
                  variant="secondary"
                  busy={busy}
                  disabled={disabled}
                  onPress={() => run(item, removeFriendship)}
                />
              }
            />
          );
        }

        // Friends: removing lives on the profile screen, behind a confirmation
        return <ProfileRow profile={item.profile} />;
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Spacing.five,
  },
  header: {
    marginTop: Spacing.four,
    marginBottom: Spacing.one,
    letterSpacing: 0.5,
  },
  empty: {
    paddingVertical: Spacing.three,
  },
  error: {
    color: "#c62828",
    marginTop: Spacing.two,
  },
});
