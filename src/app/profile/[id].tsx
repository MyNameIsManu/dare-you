import { getProfile, type PublicProfile } from "@/../utils/friends";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { FriendshipActions } from "@/components/friendship-actions";
import { ThemedText } from "@/components/themed-text";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useI18n(); // re-renders on language change; use this t (the compiler caches the global one)
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProfile(id)
      .then((found) => {
        if (!cancelled) setProfile(found);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : t("profile.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const name = profile?.display_name ?? profile?.username ?? "";

  return (
    <>
      {/* Header title follows the loaded name */}
      <Stack.Screen
        options={{
          title: profile?.username
            ? `@${profile.username}`
            : t("screens.profile"),
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        {loading ? (
          <ActivityIndicator style={styles.spinner} />
        ) : error ? (
          <ThemedText style={styles.error}>{error}</ThemedText>
        ) : !profile ? (
          <ThemedText themeColor="textSecondary">
            {t("profile.notFound")}
          </ThemedText>
        ) : (
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Avatar name={name} url={profile.avatar_url} size={96} />
            </View>

            <ThemedText type="subtitle" style={styles.center}>
              {name}
            </ThemedText>
            {profile.username && (
              <ThemedText themeColor="textSecondary">
                @{profile.username}
              </ThemedText>
            )}

            <FriendshipActions profile={profile} />
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    padding: Spacing.four,
    paddingTop: Spacing.six,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  spinner: {
    marginTop: Spacing.six,
  },
  error: {
    color: Colors.light.danger,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    gap: Spacing.two,
  },
  avatar: {
    marginBottom: Spacing.two,
  },
  center: {
    textAlign: "center",
  },
});
