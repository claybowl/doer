import { z } from "zod";

export const providerTypeSchema = z.enum([
  "letta",
  "chatgpt_oauth",
  "openai",
  "anthropic",
  "ollama",
  "ollama_cloud",
  "openrouter",
  "groq",
  "together",
  "custom",
]);

export const providerAuthModeSchema = z.enum(["api_key", "letta_cli", "oauth", "none"]);

const DEFAULT_PROVIDER_URLS: Partial<Record<z.infer<typeof providerTypeSchema>, string>> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  ollama: "http://127.0.0.1:11434",
  ollama_cloud: "https://ollama.com",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  together: "https://api.together.xyz/v1",
};

const providerConnectionInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  providerType: providerTypeSchema,
  authMode: providerAuthModeSchema,
  secretId: z.string().uuid().nullable().optional(),
  lettaBaseUrl: z.string().trim().url().default("https://api.letta.com"),
  providerBaseUrl: z.string().trim().url().nullable().optional(),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

export const createProviderConnectionSchema = providerConnectionInputSchema
  .superRefine((value, ctx) => {
    if (value.authMode === "api_key" && !value.secretId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secretId"],
        message: "An API-key connection requires a company secret",
      });
    }
    if (value.authMode !== "api_key" && value.secretId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secretId"],
        message: `Auth mode ${value.authMode} cannot reference an API-key secret`,
      });
    }
  })
  .transform((value) => ({
    ...value,
    secretId: value.secretId ?? null,
    providerBaseUrl:
      value.providerBaseUrl ?? DEFAULT_PROVIDER_URLS[value.providerType] ?? null,
  }));

export const updateProviderConnectionSchema = providerConnectionInputSchema
  .partial()
  .extend({ id: z.never().optional() });

export type CreateProviderConnection = z.infer<typeof createProviderConnectionSchema>;
export type UpdateProviderConnection = z.infer<typeof updateProviderConnectionSchema>;
