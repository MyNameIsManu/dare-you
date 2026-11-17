import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { Pressable, StyleSheet, View } from "react-native";

import { MaxContentWidth, Spacing } from "@/constants/theme";

import { useAuth } from "@/../utils/auth-context";
import { useDares } from "@/../utils/dares-context";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

/** Web tab bar (headless tabs). Keep in sync with the native tabs in app-tabs.tsx. */
export default function AppTabs() {
  const { waitingForMe } = useDares();

  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="dare" href="/dare" asChild>
            <TabButton badge={waitingForMe}>Dares</TabButton>
          </TabTrigger>
          <TabTrigger name="create" href="/create" asChild>
            <TabButton>Neu</TabButton>
          </TabTrigger>
          <TabTrigger name="friends" href="/friends" asChild>
            <TabButton>Freunde</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  badge = 0,
  ...props
}: TabTriggerSlotProps & { badge?: number }) {
  return (
    <Pressable
      {...props}
      ref={undefined}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        style={styles.tabButtonView}
      >
        <ThemedText
          type="small"
          themeColor={isFocused ? "text" : "textSecondary"}
        >
          {children}
        </ThemedText>
        {badge > 0 && (
          <View style={styles.badge} accessibilityLabel={`${badge} neu`}>
            <ThemedText type="smallBold" style={styles.badgeText}>
              {badge > 9 ? "9+" : badge}
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { session } = useAuth();
  // Set at sign-up (see sign-in.tsx), so no extra profile request is needed
  const meta = session?.user.user_metadata;
  const name = meta?.display_name ?? meta?.username;

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          {name ? `Howdy ${name}!` : "Howdy!"}
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: "#E5484D",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    lineHeight: 14,
  },
  tabListContainer: {
    position: "absolute",
    width: "100%",
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: "auto",
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  externalPressable: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});
