import { Router } from "express";
import type { Db } from "@doerai/db";
import {
	createWebhookEndpointSchema,
	updateWebhookEndpointSchema,
} from "@doerai/shared";
import { validate } from "../middleware/validate.js";
import { webhookService } from "../services/webhooks.js";
import { assertCompanyAccess } from "./authz.js";

export function webhookRoutes(db: Db) {
	const router = Router();
	const svc = webhookService(db);

	// List endpoints for a company
	router.get("/companies/:companyId/webhooks", async (req, res) => {
		const { companyId } = req.params as { companyId: string };
		assertCompanyAccess(req, companyId);
		const endpoints = await svc.listEndpoints(companyId);
		res.json(endpoints);
	});

	// Create endpoint
	router.post(
		"/companies/:companyId/webhooks",
		validate(createWebhookEndpointSchema),
		async (req, res) => {
			const { companyId } = req.params as { companyId: string };
			assertCompanyAccess(req, companyId);
			const result = await svc.createEndpoint(companyId, req.body);
			res.status(201).json(result);
		},
	);

	// Get single endpoint
	router.get("/webhooks/:id", async (req, res) => {
		const { id } = req.params as { id: string };
		const endpoint = await svc.getEndpoint(id);
		if (!endpoint) {
			res.status(404).json({ error: "Webhook endpoint not found" });
			return;
		}
		assertCompanyAccess(req, endpoint.companyId);
		res.json(endpoint);
	});

	// Update endpoint
	router.patch(
		"/webhooks/:id",
		validate(updateWebhookEndpointSchema),
		async (req, res) => {
			const { id } = req.params as { id: string };
			const existing = await svc.getEndpoint(id);
			if (!existing) {
				res.status(404).json({ error: "Webhook endpoint not found" });
				return;
			}
			assertCompanyAccess(req, existing.companyId);
			const updated = await svc.updateEndpoint(id, req.body);
			if (!updated) {
				res.status(404).json({ error: "Webhook endpoint not found" });
				return;
			}
			res.json(updated);
		},
	);

	// Delete endpoint
	router.delete("/webhooks/:id", async (req, res) => {
		const { id } = req.params as { id: string };
		const existing = await svc.getEndpoint(id);
		if (!existing) {
			res.status(404).json({ error: "Webhook endpoint not found" });
			return;
		}
		assertCompanyAccess(req, existing.companyId);
		await svc.deleteEndpoint(id);
		res.status(204).send();
	});

	// Rotate secret
	router.post("/webhooks/:id/rotate-secret", async (req, res) => {
		const { id } = req.params as { id: string };
		const existing = await svc.getEndpoint(id);
		if (!existing) {
			res.status(404).json({ error: "Webhook endpoint not found" });
			return;
		}
		assertCompanyAccess(req, existing.companyId);
		const result = await svc.rotateSecret(id);
		if (!result) {
			res.status(404).json({ error: "Webhook endpoint not found" });
			return;
		}
		res.json(result);
	});

	// Ping endpoint
	router.post("/webhooks/:id/ping", async (req, res) => {
		const { id } = req.params as { id: string };
		const existing = await svc.getEndpoint(id);
		if (!existing) {
			res.status(404).json({ error: "Webhook endpoint not found" });
			return;
		}
		assertCompanyAccess(req, existing.companyId);
		try {
			const deliveryId = await svc.ping(id);
			res.json({ deliveryId });
		} catch (err) {
			const message = err instanceof Error ? err.message : "Ping failed";
			res.status(502).json({ error: message });
		}
	});

	// List delivery log for an endpoint
	router.get("/webhooks/:id/deliveries", async (req, res) => {
			const { id } = req.params as { id: string };
			const existing = await svc.getEndpoint(id);
			if (!existing) {
				res.status(404).json({ error: "Webhook endpoint not found" });
				return;
			}
			assertCompanyAccess(req, existing.companyId);
			const { limit, before } = req.query as { limit?: string; before?: string };
			const deliveries = await svc.listDeliveries(id, {
				limit: limit ? Number(limit) : 50,
				before,
			});
			res.json(deliveries);
		}
	);

	return router;
}
