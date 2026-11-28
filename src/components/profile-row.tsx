import type { PublicProfile } from "@/../utils/friends";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { glassSurface } from "@/components/glass-card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

/** A user row: tapping avatar or name opens their profile; `right` holds actions. */
export function ProfileRow({
  profile,
  right,
  note,
  card = false,
  last = false,
}: {
  profile: PublicProfile;
  right?: ReactNode;
  /** Accent line under the username, e.g. what is going on between you */
  note?: string;
  /** Inside a glass list: roomier avatar, divider only between rows */
  card?: boolean;
  last?: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const name = profile.display_name ?? profile.username ?? "";

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: theme.backgroundSelected },
        card && styles.cardRow,
        card && last && styles.noDivider,
      ]}
    >
      <Link
        href={{ pathname: "/profile/[id]", params: { id: profile.id } }}
        asChild
      >
        <Pressable
          accessibilityRole="link"
          accessibilityHint={t("profile.openHint")}
          style={styles.link}
        >
          {/* The row layout lives on a plain View: Link/asChild can drop a style function */}
          <View style={[styles.person, card && styles.cardPerson]}>
            <Avatar
              name={name}
              url={profile.avatar_url}
              size={card ? 48 : 40}
            />
            <View style={styles.names}>
              <ThemedText
                style={[styles.displayName, card && styles.cardName]}
                numberOfLines={1}
              >
                {name}
              </ThemedText>
              {profile.username && (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={card && styles.cardMeta}
                >
                  @{profile.username}
                </ThemedText>
              )}
              {note && (
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={[
                    styles.cardMeta,
                    { color: theme.accentText, fontWeight: 600 },
                  ]}
                >
                  {note}
                </ThemedText>
              )}
            </View>
          </View>
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
    ? theme.onAccent
    : variant === "danger"
      ? theme.danger
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
        isPrimary
          ? {
              backgroundColor: theme.accent,
              borderWidth: 1,
              borderColor: theme.glassHighlight,
              boxShadow: `0 6px 14px ${theme.accentGlow}, inset 0 1px 0 ${theme.glassHighlight}`,
            }
          : glassSurface(theme),
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
  cardRow: {
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  noDivider: {
    borderBottomWidth: 0,
  },
  cardPerson: { gap: Spacing.two + Spacing.one },
  cardName: { fontWeight: 700, lineHeight: 20 },
  cardMeta: { fontSize: 13, lineHeight: 18 },
  link: { flex: 1, minWidth: 0 },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  names: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 600,
  },
  actions: {
    marginLeft: "auto",
    flexShrink: 0,
    justifyContent: "flex-end",
    flexDirection: "row",
    gap: Spacing.two,
  },
  button: {
    minWidth: 72,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.6,
  },
});
