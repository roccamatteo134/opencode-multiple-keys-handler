import type { PluginContext } from "@getpaseo/plugin";
import { fetchUsage, getConfig, saveConfig } from "./usage.server";
import { usageConfigGet, usageConfigSave, usageGet } from "./usage.shared";
import { UsageSurface } from "./usage.client";
import { UsageBarPanel } from "./usage-bar-panel.client";

export default function contribute(plugin: PluginContext) {
  plugin.handle(usageGet, fetchUsage);
  plugin.handle(usageConfigGet, getConfig);
  plugin.handle(usageConfigSave, saveConfig);

  plugin.addSurface("usage", UsageSurface);
  plugin.addSidebarItem({
    id: "usage",
    title: "OpenCode Usage",
    icon: "Gauge",
    surface: "usage",
  });

  plugin.addWorkspacePanel({
    id: "usage-bar",
    title: "OpenCode Usage",
    icon: "Gauge",
    context: "workspace",
    Component: UsageBarPanel,
  });

  plugin.addCommandCenterItem({
    id: "open-opencode-usage",
    title: "OpenCode Usage",
    icon: "Gauge",
    keywords: ["opencode", "usage", "credits", "quota", "rolling"],
    context: "global",
    onSelect({ openSurface }) {
      openSurface("usage");
    },
  });

  plugin.addCommandCenterItem({
    id: "open-opencode-usage-bar",
    title: "OpenCode Usage bar",
    icon: "Gauge",
    keywords: ["opencode", "usage", "quota", "bar"],
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("usage-bar");
    },
  });

  return () => {};
}