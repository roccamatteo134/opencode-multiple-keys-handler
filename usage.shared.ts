import { defineRpc } from "@getpaseo/plugin/server";
import { z } from "zod";

export const usageItemSchema = z.object({
  label: z.string(),
  percent: z.number(),
  reset: z.string(),
});
export type UsageItem = z.output<typeof usageItemSchema>;

export const usageGetOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  accountId: z.string().optional(),
  items: z.array(usageItemSchema).optional(),
  zenBalance: z.number().optional(),
  updatedAt: z.string().optional(),
});
export type UsageGetOutput = z.output<typeof usageGetOutputSchema>;

export const usageGetInputSchema = z.object({
  accountId: z.string().optional(),
});
export type UsageGetInput = z.output<typeof usageGetInputSchema>;

export const usageGet = defineRpc({
  name: "opencode.usage.get",
  input: usageGetInputSchema,
  output: usageGetOutputSchema,
});

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  workspaceId: z.string(),
  hasApiKey: z.boolean(),
  hasCookie: z.boolean(),
});
export type Account = z.output<typeof accountSchema>;

export const usageConfigGetOutputSchema = z.object({
  accounts: z.array(accountSchema),
  activeAccountId: z.string(),
  updatedAt: z.string().optional(),
});
export type UsageConfigGetOutput = z.output<typeof usageConfigGetOutputSchema>;

export const usageConfigGet = defineRpc({
  name: "opencode.usage.config.get",
  input: z.object({}),
  output: usageConfigGetOutputSchema,
});

export const usageAccountSaveInputSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  workspaceId: z.string().optional(),
  apiKey: z.string().optional(),
  cookie: z.string().optional(),
});
export type UsageAccountSaveInput = z.input<typeof usageAccountSaveInputSchema>;

export const usageAccountSaveOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  id: z.string().optional(),
});
export type UsageAccountSaveOutput = z.output<typeof usageAccountSaveOutputSchema>;

export const usageAccountSave = defineRpc({
  name: "opencode.usage.account.save",
  input: usageAccountSaveInputSchema,
  output: usageAccountSaveOutputSchema,
});

export const usageAccountDeleteInputSchema = z.object({
  id: z.string(),
});
export type UsageAccountDeleteInput = z.input<typeof usageAccountDeleteInputSchema>;

export const usageAccountDeleteOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type UsageAccountDeleteOutput = z.output<typeof usageAccountDeleteOutputSchema>;

export const usageAccountDelete = defineRpc({
  name: "opencode.usage.account.delete",
  input: usageAccountDeleteInputSchema,
  output: usageAccountDeleteOutputSchema,
});

export const usageAccountActivateInputSchema = z.object({
  id: z.string(),
});
export type UsageAccountActivateInput = z.input<typeof usageAccountActivateInputSchema>;

export const usageAccountActivateOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type UsageAccountActivateOutput = z.output<typeof usageAccountActivateOutputSchema>;

export const usageAccountActivate = defineRpc({
  name: "opencode.usage.account.activate",
  input: usageAccountActivateInputSchema,
  output: usageAccountActivateOutputSchema,
});

export const usageKeyStatusOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  hasActiveKey: z.boolean(),
  activeKeyAccountId: z.string().optional(),
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      hasApiKey: z.boolean(),
      active: z.boolean(),
    }),
  ),
});
export type UsageKeyStatusOutput = z.output<typeof usageKeyStatusOutputSchema>;

export const usageKeyStatus = defineRpc({
  name: "opencode.usage.key.status",
  input: z.object({}),
  output: usageKeyStatusOutputSchema,
});

export const usageKeySwitchInputSchema = z.object({
  accountId: z.string(),
});
export type UsageKeySwitchInput = z.input<typeof usageKeySwitchInputSchema>;

export const usageKeySwitchOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type UsageKeySwitchOutput = z.output<typeof usageKeySwitchOutputSchema>;

export const usageKeySwitch = defineRpc({
  name: "opencode.usage.key.switch",
  input: usageKeySwitchInputSchema,
  output: usageKeySwitchOutputSchema,
});
