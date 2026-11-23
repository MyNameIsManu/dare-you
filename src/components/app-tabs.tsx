import { useDares } from "@/../utils/dares-context";
import { NativeTabs } from "expo-router/native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { useI18n } from "@/i18n";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { waitingForMe } = useDares();
  const { t } = useI18n();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/home.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="dares">
        <NativeTabs.Trigger.Label>{t("tabs.dares")}</NativeTabs.Trigger.Label>
        {/* Invitations + proofs to review: things waiting for me */}
        {waitingForMe > 0 && (
          <NativeTabs.Trigger.Badge>
            {waitingForMe > 9 ? "9+" : String(waitingForMe)}
          </NativeTabs.Trigger.Badge>
        )}
        <NativeTabs.Trigger.Icon
          sf={{ default: "flame", selected: "flame.fill" }}
          md="local_fire_department"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Label>{t("tabs.create")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.message", selected: "plus.message.fill" }}
          md="local_fire_department"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="friends">
        <NativeTabs.Trigger.Label>{t("tabs.friends")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "figure.2", selected: "figure.2" }}
          md="local_fire_department"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
