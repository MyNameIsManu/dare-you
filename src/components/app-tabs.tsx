import { NativeTabs } from "expo-router/native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/home.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="dare">
        <NativeTabs.Trigger.Label>Dares</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "flame", selected: "flame.fill" }}
          md="local_fire_department"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Label>Neu</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.message", selected: "plus.message.fill" }}
          md="local_fire_department"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="friends">
        <NativeTabs.Trigger.Label>Freunde</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "figure.2", selected: "figure.2" }}
          md="local_fire_department"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
