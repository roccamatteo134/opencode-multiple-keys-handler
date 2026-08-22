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
  items: z.array(usageItemSchema).optional(),
  updatedAt: z.string().optional(),
});
export type UsageGetOutput = z.output<typeof usageGetOutputSchema>;

export const usageGet = defineRpc({
  name: "opencode.usage.get",
  input: z.object({}),
  output: usageGetOutputSchema,
});

export const usageConfigGetOutputSchema = z.object({
  workspaceId: z.string(),
  pageUrl: z.string(),
  hasCookie: z.boolean(),
  updatedAt: z.string().optional(),
});
export type UsageConfigGetOutput = z.output<typeof usageConfigGetOutputSchema>;

export const usageConfigGet = defineRpc({
  name: "opencode.usage.config.get",
  input: z.object({}),
  output: usageConfigGetOutputSchema,
});

export const usageConfigSaveSchema = z.object({
  workspaceId: z.string().optional(),
  pageUrl: z.string().optional(),
  cookie: z.string().optional(),
});
export type UsageConfigSaveInput = z.input<typeof usageConfigSaveSchema>;

export const usageConfigSaveOutputSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type UsageConfigSaveOutput = z.output<typeof usageConfigSaveOutputSchema>;

export const usageConfigSave = defineRpc({
  name: "opencode.usage.config.save",
  input: usageConfigSaveSchema,
  output: usageConfigSaveOutputSchema,
});