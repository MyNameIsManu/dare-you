import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { glassSurface } from "@/components/glass-card";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import {
  useIsPhoneWeb,
  WebBottomBarGap,
  WebBottomBarHeight,
} from "@/hooks/use-phone-web";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

import { useAuth } from "@/../utils/auth-context";
import { useDares } from "@/../utils/dares-context";

import { SettingsButton } from "./settings-drawer";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

/**
 * Web tab bar (headless tabs). Keep in sync with the native tabs in app-tabs.tsx.
 * Narrow windows (phones) get a floating bar at the bottom like the native app;
 * wide windows get the bar at the top.
 */
export default function AppTabs() {
  const isPhone = useIsPhoneWeb();
  return isPhone ? <PhoneTabs /> : <DesktopTabs />;
}

/** Phone layout: icons with labels in a floating glass bar at the bottom. */
function PhoneTabs() {
  const { waitingForMe } = useDares();
  const { t } = useI18n();

  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <BottomTabList>
          <TabTrigger name="index" href="/" asChild>
            <BottomTabButton
              icon="local_fire_department"
              label={t("tabs.dares")}
              badge={waitingForMe}
            />
          </TabTrigger>
          <TabTrigger name="create" href="/create" asChild>
            <PlusButton label={t("tabs.create")} size={48} />
          </TabTrigger>
          <TabTrigger name="friends" href="/friends" asChild>
            <BottomTabButton icon="group" label={t("tabs.friends")} />
          </TabTrigger>
        </BottomTabList>
      </TabList>
    </Tabs>
  );
}

/* ---------- Sliding bubble behind the active tab ---------- */

/** Phone bar: a fixed-size pill centred on the active tab. */
const BUBBLE_WIDTH = 84;
const BUBBLE_HEIGHT = WebBottomBarHeight - 2 * Spacing.one - 2; // inside the 1px border
const BUBBLE_SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

type Rect = { x: number; y: number; width: number; height: number };

/** Tabs tell the bar where they are; the bubble moves there. */
const BubbleContext = createContext<((rect: Rect) => void) | null>(null);

/**
 * For a tab button inside a BubbleTrack: returns an onLayout handler that
 * remembers where the tab is and moves the bubble there while it's active.
 */
function useBubbleTarget(isFocused: boolean | undefined) {
  const moveTo = useContext(BubbleContext);
  const rect = useRef<Rect | null>(null);

  useEffect(() => {
    if (isFocused && rect.current) moveTo?.(rect.current);
  }, [isFocused, moveTo]);

  return useCallback(
    (e: LayoutChangeEvent) => {
      rect.current = e.nativeEvent.layout;
      if (isFocused) moveTo?.(rect.current);
    },
    [isFocused, moveTo],
  );
}

/**
 * Draws the bubble behind its children (the tab buttons) and slides it to
 * whichever tab is active.
 * - "center": fixed size, centred on the tab (phone bar, tabs are wide)
 * - "fill": exactly the tab's size (desktop bar, tabs differ in width)
 */
function BubbleTrack({
  fit,
  children,
}: {
  fit: "center" | "fill";
  children: ReactNode;
}) {
  const theme = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(fit === "center" ? BUBBLE_WIDTH : 0);
  const height = useSharedValue(fit === "center" ? BUBBLE_HEIGHT : 0);
  const opacity = useSharedValue(0);
  const placed = useRef(false);

  const moveTo = useCallback(
    (rect: Rect) => {
      const target =
        fit === "center"
          ? {
              x: rect.x + rect.width / 2 - BUBBLE_WIDTH / 2,
              y: (WebBottomBarHeight - 2 - BUBBLE_HEIGHT) / 2,
              width: BUBBLE_WIDTH,
              height: BUBBLE_HEIGHT,
            }
          : rect;

      // First position: appear in place instead of flying in from the side
      const animate = placed.current
        ? (v: number) => withSpring(v, BUBBLE_SPRING)
        : (v: number) => v;
      placed.current = true;

      x.set(animate(target.x));
      y.set(animate(target.y));
      width.set(animate(target.width));
      height.set(animate(target.height));
      opacity.set(1);
    },
    [fit, x, y, width, height, opacity],
  );

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: height.value,
    borderRadius: height.value / 2,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bubble,
          { backgroundColor: theme.backgroundSelected },
          bubbleStyle,
        ]}
      />
      <BubbleContext.Provider value={moveTo}>{children}</BubbleContext.Provider>
    </>
  );
}

function BottomTabList({ children, ...props }: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.bottomBar,
        glassSurface(theme),
        { bottom: insets.bottom + WebBottomBarGap },
      ]}
    >
      <BubbleTrack fit="center">{children}</BubbleTrack>
    </View>
  );
}

/** One tab in the bottom bar: icon above a small label, badge on the icon. */
function BottomTabButton({
  icon,
  label,
  badge = 0,
  isFocused,
  ...props
}: TabTriggerSlotProps & {
  icon: SymbolViewProps["name"] & string;
  label: string;
  badge?: number;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const color = isFocused ? theme.accent : theme.textSecondary;
  const onLayout = useBubbleTarget(isFocused);

  return (
    <Pressable
      {...props}
      ref={undefined}
      onLayout={onLayout}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.bottomTab, pressed && styles.pressed]}
    >
      <View>
        <SymbolView
          name={
            { ios: icon, android: icon, web: icon } as SymbolViewProps["name"]
          }
          size={26}
          tintColor={color}
        />
        {badge > 0 && (
          <View
            style={[styles.badge, styles.iconBadge]}
            accessibilityLabel={t("tabs.newCount", { count: badge })}
          >
            <ThemedText type="smallBold" style={styles.badgeText}>
              {badge > 9 ? "9+" : badge}
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText type="smallBold" style={[styles.bottomLabel, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Desktop layout: greeting, tabs and settings in a bar at the top. */
function DesktopTabs() {
  const { waitingForMe } = useDares();
  const { t } = useI18n();

  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton badge={waitingForMe}>{t("tabs.dares")}</TabButton>
          </TabTrigger>
          <TabTrigger name="create" href="/create" asChild>
            <PlusButton label={t("tabs.create")} />
          </TabTrigger>
          <TabTrigger name="friends" href="/friends" asChild>
            <TabButton>{t("tabs.friends")}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

/** The "+" create tab: a round accent button, like in the design. */
export function PlusButton({
  isFocused,
  label,
  size = 36,
  ...props
}: TabTriggerSlotProps & { label: string; size?: number }) {
  const onLayout = useBubbleTarget(isFocused);

  return (
    <Pressable
      {...props}
      ref={undefined}
      onLayout={onLayout}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.plusButton,
        { width: size, height: size, borderRadius: size / 2 },
        isFocused && styles.plusFocused,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "plus", android: "add", web: "add" }}
        size={Math.round(size * 0.55)}
        tintColor={Colors.light.onAccent}
      />
    </Pressable>
  );
}

export function TabButton({
  children,
  isFocused,
  badge = 0,
  ...props
}: TabTriggerSlotProps & { badge?: number }) {
  const { t } = useI18n();
  const onLayout = useBubbleTarget(isFocused);

  return (
    <Pressable
      {...props}
      ref={undefined}
      onLayout={onLayout}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {/* No background of its own: the sliding bubble marks the active tab */}
      <View style={styles.tabButtonView}>
        <ThemedText
          type="small"
          themeColor={isFocused ? "text" : "textSecondary"}
        >
          {children}
        </ThemedText>
        {badge > 0 && (
          <View
            style={styles.badge}
            accessibilityLabel={t("tabs.newCount", { count: badge })}
          >
            <ThemedText type="smallBold" style={styles.badgeText}>
              {badge > 9 ? "9+" : badge}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { session } = useAuth();
  // Set at sign-up (see sign-in.tsx), so no extra profile request is needed
  const meta = session?.user.user_metadata;
  const name = meta?.display_name ?? meta?.username;
  const { t } = useI18n();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          {name ? t("tabs.greeting", { name }) : t("tabs.greetingNoName")}
        </ThemedText>

        <BubbleTrack fit="fill">{props.children}</BubbleTrack>

        <SettingsButton />
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
    backgroundColor: Colors.light.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: Colors.light.onAccent,
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
  bottomBar: {
    position: "absolute",
    left: Spacing.three,
    right: Spacing.three,
    height: WebBottomBarHeight,
    borderRadius: WebBottomBarHeight / 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.three,
  },
  bubble: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottomLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  iconBadge: {
    position: "absolute",
    top: -4,
    right: -10,
  },
  plusButton: {
    backgroundColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  plusFocused: {
    borderWidth: 3,
    borderColor: Colors.light.accentSoft,
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
