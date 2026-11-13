import { createDare } from "@/../utils/dares";
import type { PublicProfile } from "@/../utils/friends";
import { router } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble, useBubbleColors } from "@/components/chat-bubble";
import { DateField } from "@/components/date-field";
import { FriendPicker } from "@/components/friend-picker";
import { SegmentedControl } from "@/components/segmented-control";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WebBadge } from "@/components/web-badge";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const TARGETS = ["mich", "dich"] as const;
type Target = (typeof TARGETS)[number];

const ANIMATION_MS = 250;
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
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const bubble = useBubbleColors();
  const [target, setTarget] = useState<Target>("dich");
  const [friend, setFriend] = useState<PublicProfile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [today] = useState(startOfToday);
  const [dueDate, setDueDate] = useState(() => addDays(startOfToday(), 1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isForMe = target === "mich";
  const hasAssignee = isForMe || friend !== null;
  const isValid =
    hasAssignee &&
    title.trim().length > 0 &&
    countLetters(description) >= MIN_DESCRIPTION_LETTERS;
  const canSubmit = isValid && !saving;
  const submitHint = !hasAssignee
    ? "Wähle einen Freund aus."
    : !title.trim()
      ? "Gib dem Dare einen Titel."
      : `Beschreibe den Task mit mindestens ${MIN_DESCRIPTION_LETTERS} Buchstaben.`;

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
      // Switch to the Dares tab and let it highlight the new dare
      router.navigate({ pathname: "/dare", params: { highlight: String(id) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="subtitle">Ich fordere</ThemedText>
            <SegmentedControl
              options={TARGETS}
              value={target}
              onChange={setTarget}
            />

            {target === "dich" && (
              <Animated.View
                entering={FadeIn.duration(ANIMATION_MS)}
                exiting={FadeOut.duration(ANIMATION_MS / 2)}
                style={styles.stretch}
              >
                <FriendPicker value={friend} onChange={setFriend} />
              </Animated.View>
            )}

            <Animated.View
              layout={LinearTransition.duration(ANIMATION_MS)}
              style={styles.group}
            >
              <ThemedText type="subtitle">heraus bis zum</ThemedText>
              <DateField
                value={dueDate}
                onChange={setDueDate}
                minimumDate={today}
                accessibilityLabel="Fälligkeitsdatum"
              />
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Titel des Dares"
                placeholderTextColor={theme.textSecondary}
                maxLength={120}
                autoCapitalize="sentences"
                returnKeyType="done"
                accessibilityLabel="Titel des Dares"
                style={[
                  styles.friendInput,
                  styles.stretch,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                  },
                ]}
              />
              <ChatBubble>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Beschreibe den Task…"
                  placeholderTextColor={bubble.meta}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  accessibilityLabel="Beschreibung des Tasks"
                  style={[styles.descriptionInput, { color: bubble.text }]}
                />
              </ChatBubble>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy: saving }}
                accessibilityHint={canSubmit ? undefined : submitHint}
                disabled={!canSubmit}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: canSubmit
                      ? theme.text
                      : theme.backgroundElement,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  style={[
                    styles.submitLabel,
                    {
                      color: canSubmit ? theme.background : theme.textSecondary,
                    },
                  ]}
                >
                  {saving ? "Speichern…" : "Los!"}
                </ThemedText>
              </Pressable>

              {/* Temporary feedback — design follows later */}
              {!canSubmit && !saving && (
                <ThemedText type="small" themeColor="textSecondary">
                  {submitHint}
                </ThemedText>
              )}
              {error && <ThemedText style={styles.error}>{error}</ThemedText>}
            </Animated.View>
          </ThemedView>
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
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  stretch: {
    alignSelf: "stretch",
  },
  submitButton: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    marginTop: Spacing.two,
  },
  submitLabel: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: "#c62828",
    textAlign: "center",
  },
  group: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: Spacing.three,
  },
  friendInput: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
  },
  descriptionInput: {
    minHeight: 96,
    maxHeight: 240,
    padding: 0,
    fontSize: 16,
    lineHeight: 22,
  },
  centerText: {
    textAlign: "center",
  },
  linkButton: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: "center",
    gap: Spacing.one,
    alignItems: "center",
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: "center",
  },
  imageTutorial: {
    width: "100%",
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: "center",
  },
});
