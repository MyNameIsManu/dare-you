import { getProfile, type PublicProfile } from "@/../utils/friends";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { FriendshipActions } from "@/components/friendship-actions";
import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
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
          setError(e instanceof Error ? e.message : "Could not load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const name = profile?.display_name ?? profile?.username ?? "";

  return (
    <>
      {/* Header title follows the loaded name */}
      <Stack.Screen
        options={{
          title: profile?.username ? `@${profile.username}` : "Profile",
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
          <ThemedText themeColor="textSecondary">User not found</ThemedText>
        ) : (
          <View style={styles.header}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.backgroundElement },
              ]}
              accessible={false}
            >
              <ThemedText style={styles.initial}>
                {name.charAt(0).toUpperCase()}
              </ThemedText>
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
    color: "#c62828",
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    gap: Spacing.two,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  initial: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: 700,
  },
  center: {
    textAlign: "center",
  },
});
