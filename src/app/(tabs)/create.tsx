import {
  createDare,
  formatNextDareTime,
  getNextDareAllowedAt,
} from "@/../utils/dares";
import { getProfile, type PublicProfile } from "@/../utils/friends";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble, useBubbleColors } from "@/components/chat-bubble";
import { DateField } from "@/components/date-field";
import { formatDate } from "@/i18n/format";
import { BigButton } from "@/components/big-button";
import { friendName, RecipientPicker } from "@/components/recipient-picker";
import { ThemedText } from "@/components/themed-text";
import {
  Colors,
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useNow } from "@/hooks/use-now";
import { useIsPhoneWeb, usePhoneWebPadding } from "@/hooks/use-phone-web";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";
import { GlassScreen } from "@/components/glass-screen";
import { glassSurface } from "@/components/glass-card";
import { ChoiceChip } from "@/components/choice-chip";

type Target = "me" | "you";

/** Quick deadline choices: days from today. */
const DUE_CHIPS = [
  { days: 0, label: "create.today" },
  { days: 1, label: "create.dueChips.tomorrow" },
  { days: 3, label: "create.dueChips.in3Days" },
  { days: 7, label: "create.dueChips.inWeek" },
] as const;
const IDEAS = [
  "create.ideas.idea1",
  "create.ideas.idea2",
  "create.ideas.idea3",
] as const;
const MIN_DESCRIPTION_LETTERS = 5;

/** Counts letters only (incl. umlauts) — spaces, digits and punctuation don't count. */
function countLetters(text: string) {
  let count = 0;
  for (const char of text) {
    if (char.toLowerCase() !== char.toUpperCase()) count++;
  }
  return count;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function CreateScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    // The send button below the scroll view carries the tab bar inset
    bottom: Spacing.three,
  };
  const isPhoneWeb = useIsPhoneWeb();
  const phoneWebPadding = usePhoneWebPadding();
  const footerBottom = Platform.select({
    // Phone-sized web: the send button sits above the floating tab bar
    web: isPhoneWeb
      ? phoneWebPadding.paddingBottom - Spacing.one
      : Spacing.four,
    default: safeAreaInsets.bottom + BottomTabInset + Spacing.two,
  });
  const theme = useTheme();
  const { t } = useI18n();
  const bubble = useBubbleColors();
  const [target, setTarget] = useState<Target>("you");
  const [friend, setFriend] = useState<PublicProfile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [today] = useState(startOfToday);
  const [dueDate, setDueDate] = useState(() => addDays(startOfToday(), 1));
  // "Pick a date": show the date picker instead of only the quick chips
  const [customDate, setCustomDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Daily limit: when daring a friend is possible again (null = now)
  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const now = useNow();

  // Set by the "Dare" button in the Friends tab: pick that friend right away
  const { friendId } = useLocalSearchParams<{ friendId?: string }>();
  useEffect(() => {
    if (!friendId) return;
    let cancelled = false;
    getProfile(friendId)
      .then((profile) => {
        if (cancelled || !profile) return;
        setTarget("you");
        setFriend(profile);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) router.setParams({ friendId: undefined });
      });
    return () => {
      cancelled = true;
    };
  }, [friendId]);

  const loadLimit = useCallback(() => {
    getNextDareAllowedAt()
      .then(setNextAllowedAt)
      // Not critical: the database still enforces the limit on submit
      .catch(() => setNextAllowedAt(null));
  }, []);

  // Check again whenever the tab comes into view
  useFocusEffect(loadLimit);

  const isForMe = target === "me";
  const isLimited =
    !isForMe && nextAllowedAt !== null && nextAllowedAt.getTime() > now;
  const hasAssignee = isForMe || friend !== null;
  const isValid =
    !isLimited &&
    hasAssignee &&
    title.trim().length > 0 &&
    countLetters(description) >= MIN_DESCRIPTION_LETTERS;
  const canSubmit = isValid && !saving;
  const submitHint = isLimited
    ? t("create.dailyLimit", { time: formatNextDareTime(nextAllowedAt) })
    : !hasAssignee
      ? t("create.pickFriend")
      : !title.trim()
        ? t("create.needTitle")
        : t("create.needDescription", { count: MIN_DESCRIPTION_LETTERS });

  const submitLabel = saving
    ? t("create.saving")
    : isForMe
      ? t("create.sendSelf")
      : friend
        ? t("create.sendTo", { name: friendName(friend) })
        : t("create.submit");

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createDare({
        title,
        description,
        dueDate,
        // Omitted = dare yourself. A friend's dare starts as "pending".
        assigneeId: isForMe ? undefined : friend?.id,
      });
      // Clear the form for the next dare
      setFriend(null);
      setTitle("");
      setDescription("");
      setDueDate(addDays(startOfToday(), 1));
      setCustomDate(false);
      // Switch to the Dares tab and let it highlight the new dare
      router.navigate({
        pathname: "/",
        params: { highlight: String(id) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("create.saveFailed"));
    } finally {
      setSaving(false);
      // A friend dare starts the 24 h wait; also refreshes after a refusal
      loadLimit();
    }
  }

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: isPhoneWeb
      ? // Bottom space is carried by the footer with the send button
        { paddingTop: phoneWebPadding.paddingTop, paddingBottom: Spacing.four }
      : { paddingTop: Spacing.six, paddingBottom: Spacing.four },
  });

  return (
    <GlassScreen style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentInset={insets}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <View style={styles.container}>
          <ThemedText type="subtitle" style={styles.heading}>
            {t("create.newDare")}
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {t("create.whoFor")}
            </ThemedText>
            <RecipientPicker
              forMe={isForMe}
              value={friend}
              onSelectMe={() => {
                setTarget("me");
                setFriend(null);
              }}
              onSelectFriend={(f) => {
                setTarget("you");
                setFriend(f);
              }}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {t("create.challenge")}
            </ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("create.titlePlaceholder")}
              placeholderTextColor={theme.textSecondary}
              maxLength={120}
              multiline
              autoCapitalize="sentences"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              accessibilityLabel={t("create.titlePlaceholder")}
              style={[
                styles.titleInput,
                glassSurface(theme),
                { color: theme.text, borderColor: theme.text },
              ]}
            />
            <View style={styles.chips}>
              {IDEAS.map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => setTitle(t(key))}
                  style={({ pressed }) => [
                    styles.ideaChip,
                    glassSurface(theme),
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold">{t(key)}</ThemedText>
                </Pressable>
              ))}
            </View>
            <ChatBubble>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t("create.descriptionPlaceholder")}
                placeholderTextColor={bubble.meta}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                accessibilityLabel={t("create.descriptionLabel")}
                style={[styles.descriptionInput, { color: bubble.text }]}
              />
            </ChatBubble>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {t("create.untilWhen")}
            </ThemedText>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {DUE_CHIPS.map((chip) => (
                <ChoiceChip
                  key={chip.days}
                  label={t(chip.label)}
                  selected={
                    !customDate &&
                    dueDate.toDateString() ===
                      addDays(today, chip.days).toDateString()
                  }
                  onPress={() => {
                    setCustomDate(false);
                    setDueDate(addDays(today, chip.days));
                  }}
                />
              ))}
              <ChoiceChip
                dashed
                label={t("create.pickDate")}
                selected={customDate}
                onPress={() => setCustomDate(true)}
              />
            </View>
            {customDate && (
              <View style={styles.dateRow}>
                <DateField
                  value={dueDate}
                  onChange={setDueDate}
                  minimumDate={today}
                  accessibilityLabel={t("create.dueDate")}
                />
              </View>
            )}
            <View style={[styles.infoBox, glassSurface(theme)]}>
              <SymbolView
                name={{ ios: "clock", android: "schedule", web: "schedule" }}
                size={18}
                tintColor={theme.text}
              />
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.infoText}
              >
                {isForMe || !friend
                  ? t("create.dueOn", { date: formatDate(dueDate) })
                  : t("create.dueOnFriend", {
                      date: formatDate(dueDate),
                      name: friendName(friend),
                    })}
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        {!canSubmit && !saving && (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.hint}
          >
            {submitHint}
          </ThemedText>
        )}
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        <View style={styles.footerRow}>
          <BigButton
            label={submitLabel}
            busy={saving}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />
        </View>
      </View>
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
    // Without a width the container grows to its widest child (e.g. the
    // suggestion chips) and overflows narrow screens on the left
    width: "100%",
    maxWidth: Math.min(560, MaxContentWidth),
    flexGrow: 1,
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  heading: { textAlign: "center" },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 18, lineHeight: 22 },
  titleInput: {
    minHeight: 72,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 2,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  ideaChip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  descriptionInput: {
    minHeight: 72,
    maxHeight: 240,
    padding: 0,
    fontSize: 16,
    lineHeight: 22,
  },
  dateRow: { alignItems: "flex-start" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  infoText: { flex: 1 },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    alignSelf: "center",
    width: "100%",
    maxWidth: Math.min(560, MaxContentWidth),
  },
  footerRow: { flexDirection: "row" },
  hint: { textAlign: "center" },
  pressed: { opacity: 0.7 },
  error: {
    color: Colors.light.danger,
    textAlign: "center",
  },
});
