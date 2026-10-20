import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const keyEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  hasApiKey: z.boolean(),
  active: z.boolean(),
});
export type KeyEntry = z.output<typeof keyEntrySchema>;

export const keysGetOutputSchema = z.object({
  keys: z.array(keyEntrySchema),
  activeKeyId: z.string().optional(),
});
export type KeysGetOutput = z.output<typeof keysGetOutputSchema>;

export const keysGet = defineRpc({
  name: "opencode.keys.get",
  input: z.object({}),
  output: keysGetOutputSchema,
});

export const keySaveInputSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  apiKey: z.string().optional(),
});
export type KeySaveInput = z.input<typeof keySaveInputSchema>;

export const keySaveOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  id: z.string().optional(),
});
export type KeySaveOutput = z.output<typeof keySaveOutputSchema>;

export const keySave = defineRpc({
  name: "opencode.keys.save",
  input: keySaveInputSchema,
  output: keySaveOutputSchema,
});

export const keyDeleteInputSchema = z.object({
  id: z.string(),
});
export type KeyDeleteInput = z.input<typeof keyDeleteInputSchema>;

export const keyDeleteOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type KeyDeleteOutput = z.output<typeof keyDeleteOutputSchema>;

export const keyDelete = defineRpc({
  name: "opencode.keys.delete",
  input: keyDeleteInputSchema,
  output: keyDeleteOutputSchema,
});

export const keySwitchInputSchema = z.object({
  id: z.string(),
});
export type KeySwitchInput = z.input<typeof keySwitchInputSchema>;

export const keySwitchOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type KeySwitchOutput = z.output<typeof keySwitchOutputSchema>;

export const keySwitch = defineRpc({
  name: "opencode.keys.switch",
  input: keySwitchInputSchema,
  output: keySwitchOutputSchema,
});
