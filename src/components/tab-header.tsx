import { Platform, StyleSheet, View } from "react-native";

import { SettingsButton } from "@/components/settings-drawer";
import { ThemedText } from "@/components/themed-text";
import { useIsPhoneWeb } from "@/hooks/use-phone-web";

/**
 * Big page title with the settings avatar on the right — the same on every tab.
 * Place it at `useTabHeaderTop()` from the top of the screen.
 */
export function TabHeader({ title }: { title: string }) {
  const isPhoneWeb = useIsPhoneWeb();
  // Wide web windows have the settings button in the top tab bar instead
  const showSettings = Platform.OS !== "web" || isPhoneWeb;

  return (
    <View style={styles.header}>
      <ThemedText
        type="title"
        style={styles.title}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </ThemedText>
      {showSettings && <SettingsButton variant="avatar" />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Same height with or without the avatar
    minHeight: 52,
  },
  title: { flexShrink: 1 },
});
