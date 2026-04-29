import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Copy, Plus, RotateCw, Send, Trash2, Webhook } from "lucide-react";
import type { WebhookDelivery, WebhookEndpoint } from "@doerai/shared";
import { ALL_WEBHOOK_EVENT_TYPES } from "@doerai/shared";
import { webhooksApi } from "../api/webhooks";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
	if (status === "delivered") return "bg-green-500";
	if (status === "failed") return "bg-red-500";
	if (status === "retrying") return "bg-yellow-500";
	return "bg-muted-foreground";
}

function truncateUrl(url: string, max = 48): string {
	if (url.length <= max) return url;
	return url.slice(0, max) + "…";
}

function formatTs(value: Date | string | null | undefined): string {
	if (!value) return "—";
	return new Date(value).toLocaleString();
}

// ─── Secret modal ─────────────────────────────────────────────────────────────

function SecretModal({
	secret,
	label,
	onClose,
}: {
	secret: string;
	label: string;
	onClose: () => void;
}) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		void navigator.clipboard.writeText(secret).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="max-w-lg">
				<div className="space-y-4">
					<div className="space-y-1">
						<h2 className="text-base font-semibold">Your webhook secret</h2>
						<p className="text-sm text-muted-foreground">
							{label} Copy it now — it will not be shown again.
						</p>
					</div>
					<div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs break-all">
						<span className="flex-1 select-all">{secret}</span>
						<button
							type="button"
							onClick={handleCopy}
							className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
						>
							{copied ? <span className="text-xs text-green-600">Copied!</span> : <Copy className="h-3.5 w-3.5" />}
						</button>
					</div>
					<Button className="w-full" onClick={onClose}>
						Done — I saved it
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

function EndpointModal({
	companyId,
	existing,
	onClose,
	onCreated,
}: {
	companyId: string;
	existing?: WebhookEndpoint;
	onClose: () => void;
	onCreated?: (secret: string) => void;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(existing?.name ?? "");
	const [url, setUrl] = useState(existing?.url ?? "");
	const [events, setEvents] = useState<string[]>(existing?.events ?? []);
	const [error, setError] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: () => webhooksApi.create(companyId, { name: name.trim(), url: url.trim(), events }),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) });
			onCreated?.(result.secret);
			onClose();
		},
		onError: (err) => setError(err instanceof Error ? err.message : "Failed to create webhook"),
	});

	const updateMutation = useMutation({
		mutationFn: () => webhooksApi.update(existing!.id, { name: name.trim(), url: url.trim(), events }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) });
			onClose();
		},
		onError: (err) => setError(err instanceof Error ? err.message : "Failed to update webhook"),
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	function toggleEvent(event: string) {
		setEvents((prev) =>
			prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
		);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || !url.trim() || events.length === 0) {
			setError("Name, URL, and at least one event are required.");
			return;
		}
		setError(null);
		if (existing) updateMutation.mutate();
		else createMutation.mutate();
	}

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="max-w-lg">
				<form onSubmit={handleSubmit} className="space-y-4">
					<h2 className="text-base font-semibold">
						{existing ? "Edit webhook" : "Create webhook"}
					</h2>

					<div className="space-y-1">
						<label className="text-xs text-muted-foreground">Name</label>
						<input
							className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My webhook"
							autoFocus
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs text-muted-foreground">URL</label>
						<input
							className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://your-server.com/webhook"
							type="url"
						/>
					</div>

					<div className="space-y-2">
						<label className="text-xs text-muted-foreground">Events</label>
						<div className="grid grid-cols-2 gap-1.5">
							{ALL_WEBHOOK_EVENT_TYPES.map((event) => (
								<button
									key={event}
									type="button"
									onClick={() => toggleEvent(event)}
									className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-left transition-colors ${
										events.includes(event)
											? "border-primary bg-primary/10 text-primary"
											: "border-border hover:border-muted-foreground/40"
									}`}
								>
									<span
										className={`h-1.5 w-1.5 rounded-full shrink-0 ${
											events.includes(event) ? "bg-primary" : "bg-muted-foreground/40"
										}`}
									/>
									{event}
								</button>
							))}
						</div>
					</div>

					{error && (
						<p className="text-xs text-destructive">{error}</p>
					)}

					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving…" : existing ? "Save changes" : "Create"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ─── Delivery log ─────────────────────────────────────────────────────────────

function DeliveryLog({ webhookId }: { webhookId: string }) {
	const [expanded, setExpanded] = useState<string | null>(null);

	const deliveriesQuery = useQuery({
		queryKey: queryKeys.webhooks.deliveries(webhookId),
		queryFn: () => webhooksApi.listDeliveries(webhookId),
	});

	if (deliveriesQuery.isLoading) {
		return <p className="text-xs text-muted-foreground py-2">Loading deliveries…</p>;
	}

	const deliveries = deliveriesQuery.data ?? [];

	if (deliveries.length === 0) {
		return <p className="text-xs text-muted-foreground py-2">No deliveries yet.</p>;
	}

	return (
		<div className="space-y-1">
			{deliveries.map((d: WebhookDelivery) => (
				<div key={d.id} className="rounded-md border border-border text-xs">
					<button
						type="button"
						className="flex w-full items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors"
						onClick={() => setExpanded(expanded === d.id ? null : d.id)}
					>
						<span className={`h-2 w-2 rounded-full shrink-0 ${statusColor(d.status)}`} />
						<span className="font-mono text-muted-foreground w-32 shrink-0 text-left truncate">
							{d.eventType}
						</span>
						<span className="text-muted-foreground shrink-0">
							HTTP {d.responseStatus ?? "—"}
						</span>
						<span className="text-muted-foreground ml-auto shrink-0">
							{formatTs(d.createdAt)}
						</span>
						{expanded === d.id ? (
							<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
						) : (
							<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
						)}
					</button>
					{expanded === d.id && (
						<div className="border-t border-border bg-muted/20 px-3 py-2 space-y-2">
							<div>
								<p className="text-xs font-medium mb-1 text-muted-foreground">Payload</p>
								<pre className="text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap break-all">
									{JSON.stringify(d.payload, null, 2)}
								</pre>
							</div>
							{d.responseBody && (
								<div>
									<p className="text-xs font-medium mb-1 text-muted-foreground">Response</p>
									<pre className="text-xs font-mono overflow-auto max-h-20 whitespace-pre-wrap break-all text-muted-foreground">
										{d.responseBody}
									</pre>
								</div>
							)}
							<p className="text-muted-foreground">
								Attempts: {d.attempts} · Last: {formatTs(d.lastAttemptAt)}
							</p>
						</div>
					)}
				</div>
			))}
		</div>
	);
}

// ─── Endpoint row ─────────────────────────────────────────────────────────────

function EndpointRow({
	endpoint,
	companyId,
	onSecretRevealed,
}: {
	endpoint: WebhookEndpoint;
	companyId: string;
	onSecretRevealed: (secret: string, label: string) => void;
}) {
	const queryClient = useQueryClient();
	const [showLog, setShowLog] = useState(false);
	const [editing, setEditing] = useState(false);
	const [pingResult, setPingResult] = useState<{ ok: boolean; msg: string } | null>(null);

	const toggleMutation = useMutation({
		mutationFn: (enabled: boolean) => webhooksApi.update(endpoint.id, { enabled }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) }),
	});

	const deleteMutation = useMutation({
		mutationFn: () => webhooksApi.delete(endpoint.id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) }),
	});

	const rotateMutation = useMutation({
		mutationFn: () => webhooksApi.rotateSecret(endpoint.id),
		onSuccess: (result) => {
			onSecretRevealed(result.secret, `New secret for "${endpoint.name}".`);
		},
	});

	const pingMutation = useMutation({
		mutationFn: () => webhooksApi.ping(endpoint.id),
		onSuccess: () => {
			setPingResult({ ok: true, msg: "Ping delivered!" });
			setTimeout(() => setPingResult(null), 4000);
		},
		onError: (err) => {
			setPingResult({ ok: false, msg: err instanceof Error ? err.message : "Ping failed" });
			setTimeout(() => setPingResult(null), 5000);
		},
	});

	return (
		<>
			{editing && (
				<EndpointModal
					companyId={companyId}
					existing={endpoint}
					onClose={() => setEditing(false)}
				/>
			)}

			<div className="rounded-xl border border-border bg-card p-4 space-y-3">
				<div className="flex items-start gap-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-medium text-sm">{endpoint.name}</span>
							<span
								className={`h-2 w-2 rounded-full shrink-0 ${endpoint.enabled ? "bg-green-500" : "bg-muted-foreground"}`}
								title={endpoint.enabled ? "Enabled" : "Disabled"}
							/>
						</div>
						<p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">
							{truncateUrl(endpoint.url)}
						</p>
						<div className="flex flex-wrap gap-1 mt-2">
							{endpoint.events.map((e) => (
								<span
									key={e}
									className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-mono"
								>
									{e}
								</span>
							))}
						</div>
					</div>

					<div className="flex items-center gap-1 shrink-0">
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs"
							onClick={() => pingMutation.mutate()}
							disabled={pingMutation.isPending || !endpoint.enabled}
							title="Send test ping"
						>
							<Send className="h-3 w-3 mr-1" />
							Ping
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs"
							onClick={() => rotateMutation.mutate()}
							disabled={rotateMutation.isPending}
							title="Rotate signing secret"
						>
							<RotateCw className="h-3 w-3 mr-1" />
							Rotate
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs"
							onClick={() => setEditing(true)}
						>
							Edit
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
							onClick={() => {
								if (confirm(`Delete webhook "${endpoint.name}"?`)) deleteMutation.mutate();
							}}
							disabled={deleteMutation.isPending}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>

				{pingResult && (
					<p className={`text-xs ${pingResult.ok ? "text-green-600" : "text-destructive"}`}>
						{pingResult.msg}
					</p>
				)}

				<div>
					<button
						type="button"
						className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
						onClick={() => setShowLog((v) => !v)}
					>
						{showLog ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
						Delivery log
					</button>
					{showLog && (
						<div className="mt-2">
							<DeliveryLog webhookId={endpoint.id} />
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						role="switch"
						aria-checked={endpoint.enabled}
						className={`relative h-5 w-9 rounded-full transition-colors ${
							endpoint.enabled ? "bg-primary" : "bg-muted"
						}`}
						onClick={() => toggleMutation.mutate(!endpoint.enabled)}
						disabled={toggleMutation.isPending}
					>
						<span
							className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
								endpoint.enabled ? "translate-x-4" : ""
							}`}
						/>
					</button>
					<span className="text-xs text-muted-foreground">
						{endpoint.enabled ? "Enabled" : "Disabled"}
					</span>
				</div>
			</div>
		</>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Webhooks() {
	const { selectedCompanyId } = useCompany();
	const { setBreadcrumbs } = useBreadcrumbs();
	const [creating, setCreating] = useState(false);
	const [pendingSecret, setPendingSecret] = useState<{ secret: string; label: string } | null>(null);

	useEffect(() => {
		setBreadcrumbs([{ label: "Webhooks" }]);
	}, [setBreadcrumbs]);

	const endpointsQuery = useQuery({
		queryKey: queryKeys.webhooks.list(selectedCompanyId ?? ""),
		queryFn: () => webhooksApi.list(selectedCompanyId!),
		enabled: !!selectedCompanyId,
	});

	const endpoints = endpointsQuery.data ?? [];

	return (
		<div className="max-w-4xl space-y-6">
			{pendingSecret && (
				<SecretModal
					secret={pendingSecret.secret}
					label={pendingSecret.label}
					onClose={() => setPendingSecret(null)}
				/>
			)}

			{creating && selectedCompanyId && (
				<EndpointModal
					companyId={selectedCompanyId}
					onClose={() => setCreating(false)}
					onCreated={(secret) =>
						setPendingSecret({ secret, label: "Your new webhook secret." })
					}
				/>
			)}

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Webhook className="h-5 w-5 text-muted-foreground" />
					<h1 className="text-lg font-semibold">Webhooks</h1>
				</div>
				<Button size="sm" onClick={() => setCreating(true)}>
					<Plus className="h-4 w-4 mr-1.5" />
					Add webhook
				</Button>
			</div>

			<p className="text-sm text-muted-foreground">
				Receive real-time HTTP POST notifications when tasks, agents, and comments change.
				All payloads are signed with HMAC-SHA256 — verify the{" "}
				<code className="text-xs font-mono bg-muted px-1 rounded">Doer-Webhook-Signature</code>{" "}
				header to confirm authenticity.
			</p>

			{endpointsQuery.isLoading && (
				<p className="text-sm text-muted-foreground">Loading…</p>
			)}

			{!endpointsQuery.isLoading && endpoints.length === 0 && (
				<div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
					<Webhook className="h-8 w-8 mx-auto text-muted-foreground/40" />
					<p className="text-sm font-medium">No webhooks yet</p>
					<p className="text-xs text-muted-foreground max-w-xs mx-auto">
						Add a webhook endpoint to start receiving live events from Doer in your own systems.
					</p>
					<Button size="sm" className="mt-2" onClick={() => setCreating(true)}>
						<Plus className="h-3.5 w-3.5 mr-1.5" />
						Add webhook
					</Button>
				</div>
			)}

			{endpoints.length > 0 && (
				<div className="space-y-3">
					{endpoints.map((endpoint: WebhookEndpoint) => (
						<EndpointRow
							key={endpoint.id}
							endpoint={endpoint}
							companyId={selectedCompanyId!}
							onSecretRevealed={(secret, label) => setPendingSecret({ secret, label })}
						/>
					))}
				</div>
			)}
		</div>
	);
}
