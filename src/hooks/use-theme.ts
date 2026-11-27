import { Colors } from "@/constants/theme";

/**
 * Light mode only for now (see `userInterfaceStyle` in app.json).
 * To bring dark mode back: add `Colors.dark` with the same keys and pick the
 * set here from `useColorScheme()`.
 */
export function useTheme() {
  return Colors.light;
}
