import { getFriendLists, type PublicProfile } from "@/../utils/friends";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** How many matching friends to show at once. */
const MAX_VISIBLE = 5;

function displayName(p: PublicProfile) {
  return p.display_name ?? p.username ?? "Unbekannt";
}

/**
 * Pick one accepted friend. Shows the selection as a chip,
 * otherwise a filter field with matching friends to tap.
 */
export function FriendPicker({
  value,
  onChange,
}: {
  value: PublicProfile | null;
  onChange: (friend: PublicProfile | null) => void;
}) {
  const theme = useTheme();
  const [friends, setFriends] = useState<PublicProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const lists = await getFriendLists();
      setFriends(lists.friends.map((f) => f.profile));
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Freunde konnten nicht geladen werden",
      );
    }
  }, []);

  // Reload when the tab is shown again, e.g. after accepting a friend request
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Selected: show a chip that can be cleared to pick someone else
  if (value) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${displayName(value)} ausgewählt`}
        accessibilityHint="Tippen, um einen anderen Freund zu wählen"
        onPress={() => onChange(null)}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: theme.text },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={[styles.chipName, { color: theme.background }]}>
          {displayName(value)}
        </ThemedText>
        {value.username && (
          <ThemedText type="small" style={{ color: theme.background }}>
            @{value.username}
          </ThemedText>
        )}
        <ThemedText style={[styles.chipClear, { color: theme.background }]}>
          ✕
        </ThemedText>
      </Pressable>
    );
  }

  if (!friends) {
    return error ? (
      <ThemedText style={styles.error}>{error}</ThemedText>
    ) : (
      <ActivityIndicator />
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.center}
        >
          Du hast noch keine Freunde, die du herausfordern kannst.
        </ThemedText>
        <Link href="/friends">
          <ThemedText type="linkPrimary">Freunde hinzufügen</ThemedText>
        </Link>
      </View>
    );
  }

  const q = filter.trim().toLowerCase();
  const matches = friends
    .filter(
      (f) =>
        !q ||
        f.username?.toLowerCase().includes(q) ||
        f.display_name?.toLowerCase().includes(q),
    )
    .slice(0, MAX_VISIBLE);

  return (
    <View style={styles.container}>
      {/* The filter only helps once there are more friends than fit */}
      {friends.length > MAX_VISIBLE && (
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="Freund suchen…"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Freund suchen"
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
        />
      )}

      <View
        accessibilityRole="radiogroup"
        style={[styles.list, { backgroundColor: theme.backgroundElement }]}
      >
        {matches.length === 0 ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.row}
          >
            Kein Freund gefunden
          </ThemedText>
        ) : (
          matches.map((friend, i) => (
            <Pressable
              key={friend.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: false }}
              onPress={() => {
                onChange(friend);
                setFilter("");
              }}
              style={({ pressed }) => [
                styles.row,
                i > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.backgroundSelected,
                },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText style={styles.rowName}>
                {displayName(friend)}
              </ThemedText>
              {friend.username && (
                <ThemedText type="small" themeColor="textSecondary">
                  @{friend.username}
                </ThemedText>
              )}
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    gap: Spacing.two,
  },
  input: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
  },
  list: {
    borderRadius: Spacing.three,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rowName: {
    fontWeight: 600,
  },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  chipName: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 600,
  },
  chipClear: {
    marginLeft: Spacing.one,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    alignItems: "center",
    gap: Spacing.one,
  },
  center: {
    textAlign: "center",
  },
  error: {
    color: "#c62828",
    textAlign: "center",
  },
});
