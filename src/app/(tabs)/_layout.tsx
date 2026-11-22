import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppTabs from "@/components/app-tabs";
import { SettingsButton } from "@/components/settings-drawer";
import { Spacing } from "@/constants/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Web: the gear sits in the top tab bar (app-tabs.web.tsx).
  // Native tabs have no header, so the gear floats in the top-right corner.
  if (Platform.OS === "web") return <AppTabs />;

  return (
    <View style={styles.screen}>
      <AppTabs />
      <View
        pointerEvents="box-none"
        style={[styles.gear, { top: insets.top + Spacing.two }]}
      >
        <SettingsButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gear: {
    position: "absolute",
    right: Spacing.three,
  },
});
