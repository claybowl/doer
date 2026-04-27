import { z } from "zod";
import { ALL_WEBHOOK_EVENT_TYPES } from "../types/webhook.js";

export const createWebhookEndpointSchema = z.object({
	name: z.string().trim().min(1).max(200),
	url: z.string().url().max(2048),
	events: z.array(z.enum(ALL_WEBHOOK_EVENT_TYPES as [string, ...string[]])).min(1),
});

export type CreateWebhookEndpoint = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = z.object({
	name: z.string().trim().min(1).max(200).optional(),
	url: z.string().url().max(2048).optional(),
	events: z.array(z.enum(ALL_WEBHOOK_EVENT_TYPES as [string, ...string[]])).min(1).optional(),
	enabled: z.boolean().optional(),
});

export type UpdateWebhookEndpoint = z.infer<typeof updateWebhookEndpointSchema>;

export const listWebhookDeliveriesSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).optional().default(50),
	before: z.string().optional(),
});

export type ListWebhookDeliveries = z.infer<typeof listWebhookDeliveriesSchema>;
