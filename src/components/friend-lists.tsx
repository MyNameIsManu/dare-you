import {
  acceptFriendRequest,
  getFriendLists,
  getNewestUsers,
  removeFriendship,
  sendFriendRequest,
  type FriendLists as Lists,
  type FriendshipEntry,
  type PublicProfile,
} from "@/../utils/friends";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from "react-native";

import { ActionButton, ProfileRow } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { t, useI18n } from "@/i18n";

const NEWEST_COUNT = 5;

/** My friends, requests I received, requests I sent, and the newest users. */
export function FriendLists() {
  useI18n(); // re-render when the language changes
  const [lists, setLists] = useState<Lists | null>(null);
  const [newest, setNewest] = useState<PublicProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Friendship id whose button is currently working
  const [busyId, setBusyId] = useState<number | null>(null);
  // Profile id in the "new here" list whose "Add" button is working
  const [addingId, setAddingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [friendLists, newestUsers] = await Promise.all([
        getFriendLists(),
        getNewestUsers(NEWEST_COUNT),
      ]);
      setLists(friendLists);
      setNewest(newestUsers);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("friends.loadFailed"));
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
      setError(e instanceof Error ? e.message : t("common.somethingWentWrong"));
    } finally {
      setBusyId(null);
    }
  }

  async function add(profile: PublicProfile) {
    if (!profile.username) return;
    setAddingId(profile.id);
    try {
      await sendFriendRequest(profile.username);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.somethingWentWrong"));
    } finally {
      setAddingId(null);
    }
  }

  if (!lists) {
    return error ? (
      <ThemedText style={styles.error}>{error}</ThemedText>
    ) : (
      <ActivityIndicator style={styles.loading} />
    );
  }

  // Hide empty request sections; always show "friends" so the empty hint has a home
  const sections = (["incoming", "friends", "outgoing"] as const)
    .filter((key) => key === "friends" || lists[key].length > 0)
    .map((key) => ({
      key,
      title: t(`friends.sections.${key}`),
      data: lists[key],
    }));

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
        <SectionHeader title={section.title} count={section.data.length} />
      )}
      ListFooterComponent={
        newest.length > 0 ? (
          <View>
            <SectionHeader title={t("friends.sections.newest")} />
            {newest.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                right={
                  <NewestStatus
                    status={relationTo(lists, profile.id)}
                    busy={addingId === profile.id}
                    disabled={addingId !== null && addingId !== profile.id}
                    onAdd={() => add(profile)}
                  />
                }
              />
            ))}
          </View>
        ) : undefined
      }
      renderSectionFooter={({ section }) =>
        section.key === "friends" && section.data.length === 0 ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.empty}
          >
            {t("friends.empty")}
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
                    label={t("common.decline")}
                    variant="secondary"
                    disabled={busy || disabled}
                    onPress={() => run(item, removeFriendship)}
                  />
                  <ActionButton
                    label={t("common.accept")}
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
                  label={t("common.withdraw")}
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

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <ThemedText
      type="smallBold"
      themeColor="textSecondary"
      style={styles.header}
    >
      {title.toUpperCase()}
      {count !== undefined && ` · ${count}`}
    </ThemedText>
  );
}

type Relation = "none" | "friends" | "outgoing" | "incoming";

/** How I'm connected to a user, looked up in my friend lists. */
function relationTo(lists: Lists, profileId: string): Relation {
  const has = (entries: FriendshipEntry[]) =>
    entries.some((entry) => entry.profile.id === profileId);
  if (has(lists.friends)) return "friends";
  if (has(lists.outgoing)) return "outgoing";
  if (has(lists.incoming)) return "incoming";
  return "none";
}

/** "Add" button for strangers, a short status for everyone else. */
function NewestStatus({
  status,
  busy,
  disabled,
  onAdd,
}: {
  status: Relation;
  busy: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  if (status === "none") {
    return (
      <ActionButton
        label={t("friends.add")}
        busy={busy}
        disabled={disabled}
        onPress={onAdd}
      />
    );
  }
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {t(`profile.status.${status}`)}
    </ThemedText>
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
    color: Colors.light.danger,
    marginTop: Spacing.two,
  },
});
