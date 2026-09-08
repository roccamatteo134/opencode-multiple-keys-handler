import type { PluginClientContext } from "@getpaseo/plugin/client";
import { UsageSurface } from "./client/usage";
import { UsageBarPanel } from "./client/usage-bar-panel";

export default function contribute(client: PluginClientContext) {
  client.addSurface("usage", UsageSurface);
  client.addSidebarItem({
    id: "usage",
    title: "OpenCode Usage",
    icon: "Gauge",
    surface: "usage",
  });

  client.addWorkspacePanel({
    id: "usage-bar",
    title: "OpenCode Usage",
    icon: "Gauge",
    context: "workspace",
    Component: UsageBarPanel,
  });

  client.addCommandCenterItem({
    id: "open-opencode-usage",
    title: "OpenCode Usage",
    icon: "Gauge",
    keywords: ["opencode", "usage", "credits", "quota", "rolling"],
    context: "global",
    onSelect({ openSurface }) {
      openSurface("usage");
    },
  });

  client.addCommandCenterItem({
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
