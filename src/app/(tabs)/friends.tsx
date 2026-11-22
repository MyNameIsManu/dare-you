import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendSearch } from "@/components/friend-search";
import { ThemedText } from "@/components/themed-text";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

/** Narrower than the other tabs: a search field + list reads better compact. */
const FriendsContentWidth = Math.min(560, MaxContentWidth);

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();

  // Web: the tab bar floats over the top of the page, so leave room for it.
  // Native: respect the notch on top and the tab bar at the bottom.
  const platformPadding = Platform.select({
    web: {
      paddingTop: Spacing.six + Spacing.four,
      paddingBottom: Spacing.four,
    },
    default: {
      paddingTop: insets.top + Spacing.three,
      paddingBottom: insets.bottom + BottomTabInset,
    },
  });

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.background },
        platformPadding,
      ]}
    >
      <View style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>
          {t("friends.title")}
        </ThemedText>
        <FriendSearch />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: FriendsContentWidth,
    paddingHorizontal: Spacing.four,
  },
  title: {
    marginBottom: Spacing.three,
  },
});
