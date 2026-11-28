import { getFriendLists, type PublicProfile } from "@/../utils/friends";
import { Link, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Avatar } from "@/components/avatar";
import { glassSurface } from "@/components/glass-card";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { t, useI18n } from "@/i18n";

const SIZE = 56;

export function friendName(p: PublicProfile) {
  return p.display_name ?? p.username ?? t("common.unknownPerson");
}

/** One round choice with a label below; the selected one gets a ring and a check. */
function Choice({
  label,
  selected,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.circle,
          glassSurface(theme),
          selected && {
            boxShadow: `0 0 0 2px ${theme.accent}, 0 0 0 6px ${theme.accentSoft}`,
          },
        ]}
      >
        {children}
        {selected && (
          <View style={[styles.check, { backgroundColor: theme.accent }]}>
            <SymbolView
              name={{ ios: "checkmark", android: "check", web: "check" }}
              size={12}
              tintColor={theme.onAccent}
            />
          </View>
        )}
      </View>
      <ThemedText
        type="small"
        numberOfLines={1}
        style={selected && styles.selectedLabel}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * "Für wen?": myself or one accepted friend, as a row of round avatars.
 * `value` is the chosen friend; `forMe` is true when "Selbst" is chosen.
 */
export function RecipientPicker({
  forMe,
  value,
  onSelectMe,
  onSelectFriend,
}: {
  forMe: boolean;
  value: PublicProfile | null;
  onSelectMe: () => void;
  onSelectFriend: (friend: PublicProfile) => void;
}) {
  const { t } = useI18n(); // re-renders on language change; use this t (the compiler caches the global one)
  const [friends, setFriends] = useState<PublicProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const lists = await getFriendLists();
      setFriends(lists.friends.map((f) => f.profile));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("friendPicker.loadFailed"));
    }
  }, [t]);

  // Reload when the tab is shown again, e.g. after accepting a friend request
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
      >
        <Choice
          label={t("create.myself")}
          selected={forMe}
          onPress={onSelectMe}
        >
          <ThemedText style={styles.me}>{t("create.meShort")}</ThemedText>
        </Choice>
        {friends?.map((friend) => (
          <Choice
            key={friend.id}
            label={friendName(friend)}
            selected={!forMe && value?.id === friend.id}
            onPress={() => onSelectFriend(friend)}
          >
            <Avatar
              name={friendName(friend)}
              url={friend.avatar_url}
              size={SIZE - 2}
            />
          </Choice>
        ))}
        {!friends && !error && <ActivityIndicator />}
      </ScrollView>

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      {friends?.length === 0 && (
        <View style={styles.empty}>
          <ThemedText type="small" themeColor="textSecondary">
            {t("friendPicker.noFriends")}
          </ThemedText>
          <Link href="/friends">
            <ThemedText type="linkPrimary">
              {t("friendPicker.addFriends")}
            </ThemedText>
          </Link>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  // Padding so the selection ring isn't clipped by the scroll view
  row: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  choice: { width: 72, alignItems: "center", gap: Spacing.one },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  me: { fontWeight: 700 },
  check: {
    position: "absolute",
    right: -6,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLabel: { fontWeight: 700 },
  pressed: { opacity: 0.7 },
  empty: { gap: Spacing.one },
  error: { color: Colors.light.danger },
});
