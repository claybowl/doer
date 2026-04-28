import type {
	WebhookEndpoint,
	WebhookEndpointCreateResult,
	WebhookEndpointRotateResult,
	WebhookDelivery,
} from "@doerai/shared";
import { api } from "./client";

export const webhooksApi = {
	list: (companyId: string) =>
		api.get<WebhookEndpoint[]>(`/companies/${companyId}/webhooks`),

	create: (companyId: string, data: { name: string; url: string; events: string[] }) =>
		api.post<WebhookEndpointCreateResult>(`/companies/${companyId}/webhooks`, data),

	update: (id: string, data: { name?: string; url?: string; events?: string[]; enabled?: boolean }) =>
		api.patch<WebhookEndpoint>(`/webhooks/${id}`, data),

	delete: (id: string) => api.delete<void>(`/webhooks/${id}`),

	rotateSecret: (id: string) =>
		api.post<WebhookEndpointRotateResult>(`/webhooks/${id}/rotate-secret`, {}),

	ping: (id: string) =>
		api.post<{ deliveryId: string }>(`/webhooks/${id}/ping`, {}),

	listDeliveries: (id: string, limit = 50) =>
		api.get<WebhookDelivery[]>(`/webhooks/${id}/deliveries?limit=${limit}`),
};
