import { SymbolView } from "expo-symbols";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/../utils/auth-context";
import { getProfile, type PublicProfile } from "@/../utils/friends";
import { Avatar } from "@/components/avatar";
import { SegmentedControl } from "@/components/segmented-control";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { LANGUAGES, LANGUAGE_NAMES, useI18n } from "@/i18n";

const ANIMATION_MS = 250;
const MAX_WIDTH = 340;

type SettingsState = { open: () => void; close: () => void };
const SettingsContext = createContext<SettingsState | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return context;
}

/** Provides open()/close() and renders the sidebar once for the whole app. */
export function SettingsProvider({ children }: PropsWithChildren) {
  // `mounted` keeps the Modal around until the slide-out has finished
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setMounted(true);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const handleClosed = useCallback(() => setMounted(false), []);

  return (
    <SettingsContext.Provider value={{ open, close }}>
      {children}
      {mounted && (
        <SettingsDrawer
          isOpen={isOpen}
          onClose={close}
          onClosed={handleClosed}
        />
      )}
    </SettingsContext.Provider>
  );
}

/** Round gear button that opens the sidebar. */
export function SettingsButton() {
  const { open } = useSettings();
  const { t } = useI18n();
  const theme = useTheme();

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t("settings.open")}
      hitSlop={8}
      style={({ pressed }) => [
        styles.gear,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "gearshape", android: "settings", web: "settings" }}
        size={20}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

function SettingsDrawer({
  isOpen,
  onClose,
  onClosed,
}: {
  isOpen: boolean;
  onClose: () => void;
  onClosed: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(MAX_WIDTH, width * 0.85);
  const { t, language, setLanguage } = useI18n();
  const { session } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  // 0 = hidden, 1 = fully open
  const progress = useSharedValue(0);
  const closedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (closedTimer.current) clearTimeout(closedTimer.current);
    progress.value = withTiming(isOpen ? 1 : 0, { duration: ANIMATION_MS });
    // Unmount after sliding out (a timer is simpler than a worklet callback)
    if (!isOpen) closedTimer.current = setTimeout(onClosed, ANIMATION_MS);
    return () => {
      if (closedTimer.current) clearTimeout(closedTimer.current);
    };
  }, [isOpen, onClosed, progress]);

  // Fresh profile each time the sidebar opens (name or photo may have changed)
  const myId = session?.user.id;
  useEffect(() => {
    if (!myId || !isOpen) return;
    let cancelled = false;
    getProfile(myId)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {}); // Sidebar still works with the sign-up name below
    return () => {
      cancelled = true;
    };
  }, [myId, isOpen]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.4,
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * panelWidth }],
  }));

  // Until the profile has loaded, use what was saved at sign-up
  const meta = session?.user.user_metadata;
  const username: string | undefined = profile?.username ?? meta?.username;
  const name: string =
    profile?.display_name ?? meta?.display_name ?? username ?? "";

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("settings.close")}
        />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.panel,
          {
            width: panelWidth,
            backgroundColor: theme.background,
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + Spacing.three,
          },
          panelStyle,
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t("settings.title").toUpperCase()}
          </ThemedText>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("settings.close")}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={18}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>

        {/* Who is signed in */}
        <View style={styles.user}>
          <Avatar name={name} url={profile?.avatar_url} size={72} />
          <View style={styles.names}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {name}
            </ThemedText>
            {username && (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={1}
              >
                @{username}
              </ThemedText>
            )}
          </View>
        </View>

        <View
          style={[
            styles.divider,
            { backgroundColor: theme.backgroundSelected },
          ]}
        />

        <View style={styles.setting}>
          <ThemedText type="smallBold">{t("settings.language")}</ThemedText>
          <SegmentedControl
            options={LANGUAGES}
            value={language}
            onChange={setLanguage}
            getLabel={(l) => LANGUAGE_NAMES[l]}
            size="small"
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    borderTopLeftRadius: Spacing.four,
    borderBottomLeftRadius: Spacing.four,
    boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  user: {
    alignItems: "center",
    gap: Spacing.three,
  },
  names: {
    alignItems: "center",
    gap: Spacing.half,
    maxWidth: "100%",
  },
  name: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 600,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  setting: {
    gap: Spacing.two,
    alignItems: "flex-start",
  },
});
