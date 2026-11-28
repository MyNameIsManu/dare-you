import { useAuth } from "@/../utils/auth-context";
import { dareProgress } from "@/../utils/dare-progress";
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
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DaresTabs } from "@/components/dares-tabs";
import { TabHeader } from "@/components/tab-header";
import { DareCard } from "@/components/dare-card";
import { DeadlineRing } from "@/components/deadline-ring";
import { useNow } from "@/hooks/use-now";
import { ActionButton } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import {
  Colors,
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { t, useI18n } from "@/i18n";
import { GlassScreen } from "@/components/glass-screen";
import { GlassCard, glassSurface } from "@/components/glass-card";
import {
  useIsPhoneWeb,
  usePhoneWebPadding,
  useTabHeaderTop,
} from "@/hooks/use-phone-web";
import { useTheme } from "@/hooks/use-theme";
import { SymbolView } from "expo-symbols";

type Tab = "mine" | "theirs";

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
    { text: t("common.cancel"), style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

/** A section title with an optional count badge. */
function SectionTitle({ title, count }: { title: string; count?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {!!count && (
        <View style={[styles.countBadge, { backgroundColor: theme.text }]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            {count}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

export default function DareScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    // The header position comes from useTabHeaderTop() (same on every tab)
    top: 0,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const { t } = useI18n(); // re-renders on language change; use this t (the compiler caches the global one)
  const now = useNow();
  const theme = useTheme();
  const isPhoneWeb = useIsPhoneWeb();
  const phoneWebPadding = usePhoneWebPadding();
  const headerTop = useTabHeaderTop();

  // Set by the Create tab after saving: /?highlight=<id>
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
        e instanceof Error ? e.message : t("common.somethingWentWrong"),
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
      t("dares.declineConfirm"),
      t("dares.declineMessage", { name: personName(dare.creator) }),
      t("common.decline"),
      () => run(dare, () => respondToDare(dare.id, false)),
    );
  }

  function withdraw(dare: Dare) {
    confirm(
      t("dares.withdrawConfirm"),
      t("dares.withdrawMessage", { name: personName(dare.assignee) }),
      t("common.withdraw"),
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
      ? t("common.to", { name: personName(dare.assignee) })
      : t("common.from", { name: personName(dare.creator) });
  }

  // Every dare lives in exactly one place: "for me" (I do it) or "from me" (I dared someone)
  const [tab, setTab] = useState<Tab>("mine");
  const [showDone, setShowDone] = useState(false);
  const isMine = (d: Dare) => d.assignee_id === myId;
  const openMine = (dares?.open ?? []).filter(
    (d) => isMine(d) && d.status === "open",
  );
  // Own dares wait for my own review, so they show under "from me"
  const submittedMine = (dares?.open ?? []).filter(
    (d) => isMine(d) && d.status === "submitted" && d.creator_id !== myId,
  );
  const openTheirs = (dares?.open ?? []).filter(
    (d) => !isMine(d) && d.status === "open",
  );
  const doneMine = (dares?.done ?? []).filter(isMine);
  const doneTheirs = (dares?.done ?? []).filter((d) => !isMine(d));
  // Soonest deadline first (see getMyDares): the big card
  const [next, ...otherOpenMine] = openMine;
  const invitations = dares?.invitations ?? [];
  const toReview = dares?.toReview ?? [];
  const pendingSent = dares?.sent ?? [];

  const isBusy = (dare: Dare) => busyId === dare.id;
  const isLocked = (dare: Dare) => busyId !== null && busyId !== dare.id;

  const contentPlatformStyle = Platform.select<ViewStyle>({
    ios: { paddingTop: headerTop },
    android: {
      paddingTop: headerTop,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: headerTop,
      paddingBottom: isPhoneWeb ? phoneWebPadding.paddingBottom : Spacing.four,
    },
  });

  /** "Erledigt · n": tap to show or hide the finished dares. */
  const doneSection = (list: Dare[]) =>
    list.length > 0 && (
      <View style={styles.sectionBody}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showDone }}
          onPress={() => setShowDone((v) => !v)}
          style={({ pressed }) => [
            styles.doneRow,
            glassSurface(theme),
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold">
            {t("dares.doneToggle", { count: list.length })}
          </ThemedText>
          <SymbolView
            name={{
              ios: showDone ? "chevron.up" : "chevron.down",
              android: showDone ? "expand_less" : "expand_more",
              web: showDone ? "expand_less" : "expand_more",
            }}
            size={16}
            tintColor={theme.textSecondary}
          />
        </Pressable>
        {showDone &&
          list.map((dare) => (
            <DareCard
              key={dare.id}
              dare={dare}
              subtitle={otherPerson(dare)}
              onPress={() => openDare(dare)}
            />
          ))}
      </View>
    );

  const nothingHere =
    tab === "mine"
      ? openMine.length +
          invitations.length +
          submittedMine.length +
          doneMine.length ===
        0
      : openTheirs.length +
          toReview.length +
          pendingSent.length +
          doneTheirs.length ===
        0;

  return (
    <GlassScreen style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.container}>
          <TabHeader title={t("tabs.dares")} />

          <DaresTabs
            value={tab}
            onChange={setTab}
            options={[
              {
                value: "mine",
                label: t("dares.tabMine"),
                badge: invitations.length,
              },
              {
                value: "theirs",
                label: t("dares.tabTheirs"),
                badge: toReview.length,
              },
            ]}
          />

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          {!dares ? (
            !error && <ActivityIndicator style={styles.loading} />
          ) : nothingHere ? (
            <ThemedText themeColor="textSecondary" style={styles.center}>
              {t("dares.noOpen")}
            </ThemedText>
          ) : tab === "mine" ? (
            <>
              {openMine.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle title={t("dares.openTitle")} />
                  <View style={styles.sectionBody}>
                    {/* The dare with the closest deadline, big */}
                    {next && (
                      <Pressable
                        onPress={() => openDare(next)}
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <GlassCard
                          radius={Spacing.five}
                          padding={Spacing.four}
                          style={styles.hero}
                        >
                          <ThemedText type="small" themeColor="textSecondary">
                            {t("home.nextDue")}
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
                                ? t("home.ownDare")
                                : t("home.fromPerson", {
                                    name: personName(next.creator),
                                  })}
                              {" · "}
                              {t("home.timePassed", {
                                percent: Math.round(
                                  dareProgress(next, now).elapsed * 100,
                                ),
                              })}
                            </ThemedText>
                          </View>
                        </GlassCard>
                      </Pressable>
                    )}
                    {otherOpenMine.map((dare) => (
                      <DareCard
                        key={dare.id}
                        dare={dare}
                        subtitle={otherPerson(dare)}
                        highlight={
                          dare.id === highlightId || dare.id === acceptedId
                        }
                        onPress={() => openDare(dare)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {invitations.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle
                    title={t("dares.pendingTitle")}
                    count={invitations.length}
                  />
                  <View style={styles.sectionBody}>
                    {invitations.map((dare) => (
                      <DareCard
                        key={dare.id}
                        dare={dare}
                        subtitle={t("common.from", {
                          name: personName(dare.creator),
                        })}
                        onPress={() => openDare(dare)}
                        actions={
                          <>
                            <ActionButton
                              label={t("common.decline")}
                              variant="secondary"
                              disabled={isBusy(dare) || isLocked(dare)}
                              onPress={() => decline(dare)}
                            />
                            <ActionButton
                              label={t("common.accept")}
                              busy={isBusy(dare)}
                              disabled={isLocked(dare)}
                              onPress={() => accept(dare)}
                            />
                          </>
                        }
                      />
                    ))}
                  </View>
                </View>
              )}

              {submittedMine.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle title={t("dares.submittedTitle")} />
                  <View style={styles.sectionBody}>
                    {submittedMine.map((dare) => (
                      <DareCard
                        key={dare.id}
                        dare={dare}
                        subtitle={otherPerson(dare)}
                        onPress={() => openDare(dare)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {doneSection(doneMine)}
            </>
          ) : (
            <>
              {openTheirs.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle title={t("dares.openTitle")} />
                  <View style={styles.sectionBody}>
                    {openTheirs.map((dare) => (
                      <DareCard
                        key={dare.id}
                        dare={dare}
                        subtitle={otherPerson(dare)}
                        onPress={() => openDare(dare)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {toReview.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle
                    title={t("dares.toReviewDaresTitle")}
                    count={toReview.length}
                  />
                  <View style={styles.sectionBody}>
                    {toReview.map((dare) => (
                      <DareCard
                        key={dare.id}
                        dare={dare}
                        subtitle={t("dares.proofFrom", {
                          name: personName(dare.assignee),
                        })}
                        onPress={() => openDare(dare)}
                        actions={
                          <ActionButton
                            label={t("dares.view")}
                            onPress={() => openDare(dare)}
                          />
                        }
                      />
                    ))}
                  </View>
                </View>
              )}

              {pendingSent.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle title={t("dares.pendingTitle")} />
                  <View style={styles.sectionBody}>
                    {pendingSent.map((dare) => (
                      <DareCard
                        key={dare.id}
                        dare={dare}
                        subtitle={t("common.to", {
                          name: personName(dare.assignee),
                        })}
                        highlight={dare.id === highlightId}
                        onPress={() => openDare(dare)}
                        actions={
                          <ActionButton
                            label={t("common.withdraw")}
                            variant="danger"
                            busy={isBusy(dare)}
                            disabled={isLocked(dare)}
                            onPress={() => withdraw(dare)}
                          />
                        }
                      />
                    ))}
                  </View>
                </View>
              )}

              {doneSection(doneTheirs)}
            </>
          )}
        </View>
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: Math.min(560, MaxContentWidth),
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  section: { gap: Spacing.three },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  sectionTitle: { fontSize: 20, lineHeight: 24 },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBody: { gap: Spacing.three },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
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
  center: { textAlign: "center" },
  pressed: { opacity: 0.7 },
  loading: { marginTop: Spacing.six },
  error: {
    color: Colors.light.danger,
    textAlign: "center",
  },
});
