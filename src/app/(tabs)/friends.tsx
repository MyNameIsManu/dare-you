import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendSearch } from "@/components/friend-search";
import { GlassScreen } from "@/components/glass-screen";
import { TabHeader } from "@/components/tab-header";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import {
  useIsPhoneWeb,
  usePhoneWebPadding,
  useTabHeaderTop,
} from "@/hooks/use-phone-web";
import { useI18n } from "@/i18n";

/** Narrower than the other tabs: a search field + list reads better compact. */
const FriendsContentWidth = Math.min(560, MaxContentWidth);

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const isPhoneWeb = useIsPhoneWeb();
  const phoneWebPadding = usePhoneWebPadding();
  // Same header position as every other tab
  const headerTop = useTabHeaderTop();

  // Bottom: clear the tab bar (native and phone web) or leave a small margin.
  const platformPadding = Platform.select({
    web: {
      paddingTop: headerTop,
      paddingBottom: isPhoneWeb ? phoneWebPadding.paddingBottom : Spacing.four,
    },
    default: {
      paddingTop: headerTop,
      paddingBottom: insets.bottom + BottomTabInset,
    },
  });

  return (
    <GlassScreen style={[styles.screen, platformPadding]}>
      <View style={styles.container}>
        <TabHeader title={t("friends.title")} />
        <FriendSearch />
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: FriendsContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
});
