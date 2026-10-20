import type { PluginServerContext } from "@getpaseo/plugin/server";
import { deleteKey, getKeys, saveKey, switchKey } from "./server/keys";
import { keyDelete, keySave, keySwitch, keysGet } from "./shared/keys";

export default function contribute(server: PluginServerContext) {
  server.handle(keysGet, getKeys);
  server.handle(keySave, saveKey);
  server.handle(keyDelete, deleteKey);
  server.handle(keySwitch, switchKey);

  return () => {};
}
