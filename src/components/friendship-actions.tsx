import {
  acceptFriendRequest,
  getFriendshipWith,
  removeFriendship,
  sendFriendRequest,
  type FriendshipStatus,
  type PublicProfile,
} from "@/../utils/friends";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { ActionButton } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

const STATUS_LABEL: Record<
  Exclude<FriendshipStatus["kind"], "self">,
  string
> = {
  none: "Not friends yet",
  outgoing: "Friend request sent",
  incoming: "Wants to be your friend",
  friends: "✓ Friends",
};

/** Friendship status with the matching buttons, for a profile screen. */
export function FriendshipActions({ profile }: { profile: PublicProfile }) {
  const [status, setStatus] = useState<FriendshipStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await getFriendshipWith(profile.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load status");
    }
  }, [profile.id]);

  // Load on open, and again whenever this screen comes back into view
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(friendshipId: number) {
    const remove = () => run(() => removeFriendship(friendshipId));
    // Alert with buttons isn't supported on web
    if (Platform.OS === "web") return remove();

    const name = profile.display_name ?? profile.username;
    Alert.alert("Remove friend?", `${name} will no longer be your friend.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: remove },
    ]);
  }

  if (!status) {
    return error ? (
      <ThemedText style={styles.error}>{error}</ThemedText>
    ) : (
      <ActivityIndicator />
    );
  }

  // Your own profile: nothing to do
  if (status.kind === "self") return null;

  return (
    <View style={styles.container}>
      <ThemedText
        type="smallBold"
        themeColor={status.kind === "friends" ? "text" : "textSecondary"}
      >
        {STATUS_LABEL[status.kind]}
      </ThemedText>

      <View style={styles.buttons}>
        {status.kind === "none" && profile.username && (
          <ActionButton
            label="Add friend"
            busy={busy}
            onPress={() => run(() => sendFriendRequest(profile.username!))}
          />
        )}

        {status.kind === "outgoing" && (
          <ActionButton
            label="Cancel request"
            variant="secondary"
            busy={busy}
            onPress={() => run(() => removeFriendship(status.friendshipId))}
          />
        )}

        {status.kind === "incoming" && (
          <>
            <ActionButton
              label="Decline"
              variant="secondary"
              disabled={busy}
              onPress={() => run(() => removeFriendship(status.friendshipId))}
            />
            <ActionButton
              label="Accept"
              busy={busy}
              onPress={() =>
                run(() => acceptFriendRequest(status.friendshipId))
              }
            />
          </>
        )}

        {status.kind === "friends" && (
          <ActionButton
            label="Remove friend"
            variant="danger"
            busy={busy}
            onPress={() => confirmRemove(status.friendshipId)}
          />
        )}
      </View>

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  error: {
    color: "#c62828",
    textAlign: "center",
  },
});
