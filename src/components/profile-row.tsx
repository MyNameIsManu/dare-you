import type { PublicProfile } from "@/../utils/friends";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** A user row: tapping the name opens their profile; `right` holds actions. */
export function ProfileRow({
  profile,
  right,
}: {
  profile: PublicProfile;
  right?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <Link
        href={{ pathname: "/profile/[id]", params: { id: profile.id } }}
        asChild
      >
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Opens this profile"
          style={({ pressed }) => [styles.names, pressed && styles.pressed]}
        >
          <ThemedText style={styles.displayName} numberOfLines={1}>
            {profile.display_name ?? profile.username}
          </ThemedText>
          {profile.username && (
            <ThemedText type="small" themeColor="textSecondary">
              @{profile.username}
            </ThemedText>
          )}
        </Pressable>
      </Link>
      {right && <View style={styles.actions}>{right}</View>}
    </View>
  );
}

/** Compact pill button for row and profile actions. */
export function ActionButton({
  label,
  onPress,
  variant = "primary",
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const textColor = isPrimary
    ? theme.background
    : variant === "danger"
      ? "#E5484D"
      : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? theme.text : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  names: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 600,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  button: {
    minWidth: 72,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
});
