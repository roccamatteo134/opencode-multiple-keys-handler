import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  deleteAccount,
  fetchUsage,
  getConfig,
  getKeyStatus,
  saveAccount,
  setActiveAccount,
  switchActiveKey,
} from "./server/usage";
import {
  usageAccountActivate,
  usageAccountDelete,
  usageAccountSave,
  usageConfigGet,
  usageGet,
  usageKeyStatus,
  usageKeySwitch,
} from "./shared/usage";

export default function contribute(server: PluginServerContext) {
  server.handle(usageGet, fetchUsage);
  server.handle(usageConfigGet, getConfig);
  server.handle(usageAccountSave, saveAccount);
  server.handle(usageAccountDelete, deleteAccount);
  server.handle(usageAccountActivate, setActiveAccount);
  server.handle(usageKeyStatus, getKeyStatus);
  server.handle(usageKeySwitch, switchActiveKey);

  return () => {};
}
