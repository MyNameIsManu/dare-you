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
import { useAuth } from "@/../utils/auth-context";
import { useDares } from "@/../utils/dares-context";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { glassSurface } from "@/components/glass-card";
import { ActionButton, ProfileRow } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

const NEWEST_COUNT = 5;

type Relation = "none" | "friends" | "outgoing" | "incoming";

/** How I'm connected to a user, looked up in my friend lists. */
export function relationTo(lists: Lists, profileId: string): Relation {
  const has = (entries: FriendshipEntry[]) =>
    entries.some((entry) => entry.profile.id === profileId);
  if (has(lists.friends)) return "friends";
  if (has(lists.outgoing)) return "outgoing";
  if (has(lists.incoming)) return "incoming";
  return "none";
}

/** A rounded glass container; rows inside get dividers between them. */
export function GlassList({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.glassList, glassSurface(theme)]}>{children}</View>
  );
}

/** My friends, requests I received, requests I sent, and the newest users. */
export function FriendLists() {
  const { t } = useI18n(); // re-renders on language change; use this t (the compiler caches the global one)
  const theme = useTheme();
  const { session } = useAuth();
  const myId = session?.user.id;
  const { dares } = useDares();
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
  }, [t]);

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

  /** What is going on between me and this friend, if anything. */
  function noteFor(friendId: string): string | undefined {
    if (!dares) return undefined;
    const theirs = (d: { assignee_id: string; creator_id: string }) =>
      d.assignee_id === friendId && d.creator_id === myId;
    const running = dares.open.find((d) => theirs(d) && d.status === "open");
    if (running) return t("friends.statusRunning", { title: running.title });
    if (dares.toReview.some(theirs)) return t("friends.statusProof");
    if (dares.sent.some(theirs)) return t("friends.statusPending");
    const reviewing = dares.open.find(
      (d) =>
        d.creator_id === friendId &&
        d.assignee_id === myId &&
        d.status === "submitted",
    );
    return reviewing ? t("friends.statusReviewing") : undefined;
  }

  if (!lists) {
    return error ? (
      <ThemedText style={styles.error}>{error}</ThemedText>
    ) : (
      <ActivityIndicator style={styles.loading} />
    );
  }

  const challenge = (friend: PublicProfile) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("friends.dare")}
      onPress={() =>
        router.navigate({
          pathname: "/create",
          params: { friendId: friend.id },
        })
      }
      style={({ pressed }) => [
        styles.dareButton,
        {
          backgroundColor: theme.accent,
          borderWidth: 1,
          borderColor: theme.glassHighlight,
          boxShadow: `0 6px 14px ${theme.accentGlow}, inset 0 1px 0 ${theme.glassHighlight}`,
        },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "bolt.fill", android: "bolt", web: "bolt" }}
        size={14}
        tintColor={theme.onAccent}
      />
      <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
        {t("friends.dare")}
      </ThemedText>
    </Pressable>
  );

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      {lists.incoming.length > 0 && (
        <Section
          title={t("friends.sections.incoming")}
          count={lists.incoming.length}
          dark
        >
          {lists.incoming.map((item) => {
            const busy = busyId === item.friendshipId;
            const disabled = busyId !== null && !busy;
            return (
              <GlassList key={item.friendshipId}>
                <ProfileRow
                  card
                  last
                  profile={item.profile}
                  note={t("friends.wantsToBe")}
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
              </GlassList>
            );
          })}
        </Section>
      )}

      <Section
        title={t("friends.sections.friends")}
        count={lists.friends.length}
      >
        {lists.friends.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t("friends.empty")}
          </ThemedText>
        ) : (
          <GlassList>
            {lists.friends.map((item, i) => (
              <ProfileRow
                key={item.friendshipId}
                card
                last={i === lists.friends.length - 1}
                profile={item.profile}
                note={noteFor(item.profile.id)}
                right={challenge(item.profile)}
              />
            ))}
          </GlassList>
        )}
      </Section>

      {lists.outgoing.length > 0 && (
        <Section title={t("friends.sections.outgoing")}>
          <GlassList>
            {lists.outgoing.map((item, i) => {
              const busy = busyId === item.friendshipId;
              return (
                <ProfileRow
                  key={item.friendshipId}
                  card
                  last={i === lists.outgoing.length - 1}
                  profile={item.profile}
                  right={
                    <ActionButton
                      label={t("common.withdraw")}
                      variant="secondary"
                      busy={busy}
                      disabled={busyId !== null && !busy}
                      onPress={() => run(item, removeFriendship)}
                    />
                  }
                />
              );
            })}
          </GlassList>
        </Section>
      )}

      {newest.length > 0 && (
        <Section title={t("friends.sections.newest")}>
          <GlassList>
            {newest.map((profile, i) => (
              <ProfileRow
                key={profile.id}
                card
                last={i === newest.length - 1}
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
          </GlassList>
        </Section>
      )}
    </ScrollView>
  );
}

function Section({
  title,
  count,
  dark = false,
  children,
}: {
  title: string;
  count?: number;
  /** Dark count badge: something here needs an answer */
  dark?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {count !== undefined && (
          <View
            style={[
              styles.count,
              { backgroundColor: dark ? theme.text : theme.backgroundElement },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: dark ? theme.background : theme.text }}
            >
              {count}
            </ThemedText>
          </View>
        )}
      </View>
      {children}
    </View>
  );
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
  const { t } = useI18n(); // re-renders on language change; use this t (the compiler caches the global one)
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
  return <StatusPill text={t(`profile.status.${status}`)} />;
}

/** A small grey pill for a relationship status. */
export function StatusPill({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={styles.pillText}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  loading: { marginTop: Spacing.five },
  section: { gap: Spacing.three },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  sectionTitle: { fontSize: 20, lineHeight: 24 },
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  glassList: {
    borderRadius: Spacing.four + Spacing.two,
    overflow: "hidden",
  },
  dareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one + 2,
    height: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  pill: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pillText: { fontSize: 12, lineHeight: 16 },
  pressed: { opacity: 0.7 },
  error: {
    color: Colors.light.danger,
    marginTop: Spacing.two,
  },
});
