import type { PluginClientContext } from "@getpaseo/plugin/client";
import { KeysSurface } from "./client/keys";

export default function contribute(client: PluginClientContext) {
  client.addSurface("keys", KeysSurface);
  client.addSidebarItem({
    id: "keys",
    title: "OpenCode Keys Handler",
    icon: "Key",
    surface: "keys",
  });

  client.addCommandCenterItem({
    id: "open-opencode-keys",
    title: "OpenCode Keys Handler",
    icon: "Key",
    keywords: ["opencode", "keys", "api", "switch"],
    context: "global",
    onSelect({ openSurface }) {
      openSurface("keys");
    },
  });

  return () => {};
}
