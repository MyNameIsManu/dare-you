import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";

/** Browser windows narrower than this get the phone layout (tab bar at the bottom). */
export const PhoneWebMaxWidth = 768;

/** Height of the floating bottom tab bar on phone-sized web. */
export const WebBottomBarHeight = 64;

/** Gap between the bottom tab bar and the bottom edge / home indicator. */
export const WebBottomBarGap = Spacing.two;

/**
 * True in a narrow browser window (a phone, or a small desktop window).
 * Then the web app looks like the native app: tab bar at the bottom,
 * settings button in each screen's header.
 */
export function useIsPhoneWeb() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width < PhoneWebMaxWidth;
}

/**
 * Padding a tab screen needs on phone-sized web, so its content clears
 * the notch at the top and the floating tab bar at the bottom.
 */
export function usePhoneWebPadding() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + Spacing.three,
    paddingBottom:
      insets.bottom + WebBottomBarGap + WebBottomBarHeight + Spacing.three,
  };
}

/**
 * Distance from the top of the screen to a tab screen's header (title + avatar).
 * Every tab uses this, so the header doesn't jump when switching tabs.
 */
export function useTabHeaderTop() {
  const insets = useSafeAreaInsets();
  const isPhoneWeb = useIsPhoneWeb();
  // Wide web: below the floating top tab bar. Everywhere else: below the notch.
  if (Platform.OS === "web" && !isPhoneWeb) return Spacing.six + Spacing.three;
  return insets.top + Spacing.three;
}
