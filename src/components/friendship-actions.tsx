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
import { Colors, Spacing } from "@/constants/theme";
import { useI18n } from "@/i18n";

/** Friendship status with the matching buttons, for a profile screen. */
export function FriendshipActions({ profile }: { profile: PublicProfile }) {
  const { t } = useI18n(); // re-renders on language change; use this t (the compiler caches the global one)
  const [status, setStatus] = useState<FriendshipStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await getFriendshipWith(profile.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("profile.statusLoadFailed"));
    }
  }, [profile.id, t]);

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
      setError(e instanceof Error ? e.message : t("common.somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(friendshipId: number) {
    const remove = () => run(() => removeFriendship(friendshipId));
    // Alert with buttons isn't supported on web
    if (Platform.OS === "web") return remove();

    const name =
      profile.display_name ?? profile.username ?? t("common.unknownPerson");
    Alert.alert(
      t("profile.removeConfirm"),
      t("profile.removeMessage", { name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("profile.remove"), style: "destructive", onPress: remove },
      ],
    );
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
        {t(`profile.status.${status.kind}`)}
      </ThemedText>

      <View style={styles.buttons}>
        {status.kind === "none" && profile.username && (
          <ActionButton
            label={t("profile.addFriend")}
            busy={busy}
            onPress={() => run(() => sendFriendRequest(profile.username!))}
          />
        )}

        {status.kind === "outgoing" && (
          <ActionButton
            label={t("profile.cancelRequest")}
            variant="secondary"
            busy={busy}
            onPress={() => run(() => removeFriendship(status.friendshipId))}
          />
        )}

        {status.kind === "incoming" && (
          <>
            <ActionButton
              label={t("common.decline")}
              variant="secondary"
              disabled={busy}
              onPress={() => run(() => removeFriendship(status.friendshipId))}
            />
            <ActionButton
              label={t("common.accept")}
              busy={busy}
              onPress={() =>
                run(() => acceptFriendRequest(status.friendshipId))
              }
            />
          </>
        )}

        {status.kind === "friends" && (
          <ActionButton
            label={t("profile.removeFriend")}
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
    color: Colors.light.danger,
    textAlign: "center",
  },
});
