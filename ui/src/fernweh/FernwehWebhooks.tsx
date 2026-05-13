import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { webhooksApi } from "@/api/webhooks";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type { WebhookEndpoint, WebhookDelivery } from "@doerai/shared";
import { ALL_WEBHOOK_EVENT_TYPES } from "@doerai/shared";
import { Icon, I, ErrorState, LoadingState, formatRelative } from "./utils";

/* ============================================================
   FernwehWebhooks — full CRUD for webhook endpoints
============================================================ */

// ---------- Toggle ----------

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        background: on ? "var(--accent)" : "var(--line)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: on ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: "var(--bg)",
          transition: "left 0.15s",
        }}
      />
    </div>
  );
}

// ---------- SecretModal ----------

function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);

  function copy() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        className="fw-card"
        style={{ width: 480, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔑</span>
          <strong style={{ color: "var(--ink)", fontSize: 15 }}>Webhook secret — save it now</strong>
        </div>
        <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
          This secret will only be shown once. Copy it before closing.
        </p>
        <div
          className="fw-mono"
          style={{
            background: "var(--bg-sunken)",
            border: "1px solid var(--line-soft)",
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--ink)",
            wordBreak: "break-all",
          }}
        >
          {secret}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={copy}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Done — I saved it
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- EndpointForm ----------

interface FormValues {
  name: string;
  url: string;
  events: string[];
}

function EndpointForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<FormValues>;
  onSave: (v: FormValues) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [url, setUrl] = React.useState(initial?.url ?? "");
  const [events, setEvents] = React.useState<string[]>(initial?.events ?? []);

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    onSave({ name, url, events });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 6,
    border: "1px solid var(--line)",
    background: "var(--bg-sunken)",
    color: "var(--ink)",
    fontSize: 13,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        className="fw-card"
        style={{ width: 520, padding: 28, display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflowY: "auto" }}
      >
        <strong style={{ color: "var(--ink)", fontSize: 15 }}>
          {initial?.name ? "Edit webhook" : "Add webhook"}
        </strong>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, color: "var(--ink-dim)", fontWeight: 600 }}>Name</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My webhook"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, color: "var(--ink-dim)", fontWeight: 600 }}>URL</label>
            <input
              style={inputStyle}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hook"
              type="url"
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--ink-dim)", fontWeight: 600 }}>Events</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                background: "var(--bg-sunken)",
                border: "1px solid var(--line-soft)",
                borderRadius: 6,
                padding: 10,
              }}
            >
              {ALL_WEBHOOK_EVENT_TYPES.map((ev) => (
                <label
                  key={ev}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--ink-dim)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="fw-mono">{ev}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "7px 16px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: "var(--ink)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "7px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- DeliveryLog ----------

const DELIVERY_COLOR: Record<string, string> = {
  delivered: "var(--accent)",
  failed: "var(--danger)",
  retrying: "var(--warn)",
};

function DeliveryLog({ endpointId }: { endpointId: string }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.webhooks.deliveries(endpointId),
    queryFn: () => webhooksApi.listDeliveries(endpointId, 20),
  });

  if (isLoading) return <div style={{ padding: "10px 0", fontSize: 12, color: "var(--ink-dim)" }}>Loading deliveries…</div>;
  if (!data?.length) return <div style={{ padding: "10px 0", fontSize: 12, color: "var(--ink-faint)" }}>No deliveries yet.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8 }}>
      {data.map((d) => (
        <div key={d.id}>
          <div
            onClick={() => setExpanded(expanded === d.id ? null : d.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 5,
              cursor: "pointer",
              background: expanded === d.id ? "var(--bg-sunken)" : "transparent",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: DELIVERY_COLOR[d.status] ?? "var(--ink-faint)",
                flexShrink: 0,
              }}
            />
            <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink-dim)", flex: 1 }}>{d.eventType}</span>
            {d.responseStatus != null && (
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{d.responseStatus}</span>
            )}
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              {d.lastAttemptAt ? formatRelative(d.lastAttemptAt) : formatRelative(d.createdAt)}
            </span>
            <Icon d={I.chevron} size={12} style={{ color: "var(--ink-faint)", transform: expanded === d.id ? "rotate(90deg)" : undefined }} />
          </div>
          {expanded === d.id && (
            <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
              {d.payload && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 4 }}>Payload</div>
                  <pre
                    className="fw-mono"
                    style={{
                      margin: 0,
                      padding: "8px 10px",
                      background: "var(--bg-sunken)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 5,
                      fontSize: 11,
                      color: "var(--ink-dim)",
                      overflow: "auto",
                      maxHeight: 160,
                    }}
                  >
                    {JSON.stringify(d.payload, null, 2)}
                  </pre>
                </div>
              )}
              {d.responseBody && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 4 }}>Response</div>
                  <pre
                    className="fw-mono"
                    style={{
                      margin: 0,
                      padding: "8px 10px",
                      background: "var(--bg-sunken)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 5,
                      fontSize: 11,
                      color: "var(--ink-dim)",
                      overflow: "auto",
                      maxHeight: 120,
                    }}
                  >
                    {d.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- EndpointCard ----------

function EndpointCard({
  endpoint,
  onEdit,
  onSecret,
}: {
  endpoint: WebhookEndpoint;
  onEdit: (ep: WebhookEndpoint) => void;
  onSecret: (secret: string) => void;
}) {
  const qc = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const [showLog, setShowLog] = React.useState(false);
  const [pingMsg, setPingMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const updateMut = useMutation({
    mutationFn: (patch: Parameters<typeof webhooksApi.update>[1]) =>
      webhooksApi.update(endpoint.id, patch),
    onSuccess: () => {
      if (!companyId) return;
      qc.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => webhooksApi.delete(endpoint.id),
    onSuccess: () => {
      if (!companyId) return;
      qc.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) });
    },
  });

  const rotateMut = useMutation({
    mutationFn: () => webhooksApi.rotateSecret(endpoint.id),
    onSuccess: (data) => onSecret(data.secret),
  });

  const pingMut = useMutation({
    mutationFn: () => webhooksApi.ping(endpoint.id),
    onSuccess: () => {
      setPingMsg({ ok: true, text: "Ping delivered!" });
      setTimeout(() => setPingMsg(null), 4000);
    },
    onError: (err: Error) => {
      setPingMsg({ ok: false, text: err.message ?? "Ping failed" });
      setTimeout(() => setPingMsg(null), 4000);
    },
  });

  function handleDelete() {
    if (confirm(`Delete webhook "${endpoint.name}"?`)) deleteMut.mutate();
  }

  const btnBase: React.CSSProperties = {
    padding: "5px 11px",
    borderRadius: 5,
    border: "1px solid var(--line-soft)",
    background: "var(--bg-raised)",
    color: "var(--ink-dim)",
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 5,
  };

  return (
    <div className="fw-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: endpoint.enabled ? "var(--accent)" : "var(--ink-faint)",
            flexShrink: 0,
          }}
        />
        <strong style={{ color: "var(--ink)", fontSize: 14, flex: 1 }}>{endpoint.name}</strong>
        <Toggle
          on={endpoint.enabled}
          onChange={(v) => updateMut.mutate({ enabled: v })}
        />
      </div>

      {/* URL */}
      <div
        className="fw-mono"
        style={{
          fontSize: 12,
          color: "var(--ink-dim)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {endpoint.url}
      </div>

      {/* Events */}
      {endpoint.events.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {endpoint.events.map((ev) => (
            <span
              key={ev}
              className="fw-chip fw-mono"
              style={{ fontSize: 11 }}
            >
              {ev}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          style={{ ...btnBase, opacity: !endpoint.enabled ? 0.5 : 1 }}
          disabled={!endpoint.enabled || pingMut.isPending}
          onClick={() => pingMut.mutate()}
          title="Send a test ping"
        >
          <span>📡</span> Ping
        </button>
        <button
          style={btnBase}
          disabled={rotateMut.isPending}
          onClick={() => rotateMut.mutate()}
          title="Rotate signing secret"
        >
          <span>🔄</span> Rotate secret
        </button>
        <button
          style={btnBase}
          onClick={() => onEdit(endpoint)}
          title="Edit"
        >
          <span>✏️</span> Edit
        </button>
        <button
          style={{ ...btnBase, color: "var(--danger)", borderColor: "var(--danger)" }}
          disabled={deleteMut.isPending}
          onClick={handleDelete}
          title="Delete"
        >
          <span>🗑️</span> Delete
        </button>

        {pingMsg && (
          <span
            style={{
              fontSize: 12,
              color: pingMsg.ok ? "var(--accent)" : "var(--danger)",
              marginLeft: 4,
            }}
          >
            {pingMsg.text}
          </span>
        )}

        {/* Spacer + delivery log toggle */}
        <div style={{ flex: 1 }} />
        <button
          style={{ ...btnBase, gap: 5 }}
          onClick={() => setShowLog((v) => !v)}
        >
          <Icon
            d={I.chevron}
            size={12}
            style={{ transform: showLog ? "rotate(90deg)" : undefined, transition: "transform 0.15s" }}
          />
          Deliveries
        </button>
      </div>

      {showLog && <DeliveryLog endpointId={endpoint.id} />}
    </div>
  );
}

// ---------- FernwehWebhooks ----------

export function FernwehWebhooks() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const qc = useQueryClient();

  const [formTarget, setFormTarget] = React.useState<WebhookEndpoint | "new" | null>(null);
  const [pendingSecret, setPendingSecret] = React.useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.webhooks.list(companyId ?? "__empty__"),
    queryFn: () => webhooksApi.list(companyId!),
    enabled: !!companyId,
  });

  const createMut = useMutation({
    mutationFn: (v: { name: string; url: string; events: string[] }) =>
      webhooksApi.create(companyId!, v),
    onSuccess: (result) => {
      if (companyId) {
        qc.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) });
      }
      setFormTarget(null);
      if (result.secret) setPendingSecret(result.secret);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof webhooksApi.update>[1] }) =>
      webhooksApi.update(id, patch),
    onSuccess: () => {
      if (companyId) {
        qc.invalidateQueries({ queryKey: queryKeys.webhooks.list(companyId) });
      }
      setFormTarget(null);
    },
  });

  if (!selectedCompany) {
    return (
      <ErrorState
        error="No company selected"
        hint="Choose a company from the sidebar, then open Webhooks again."
      />
    );
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error="Failed to load webhooks" hint="Check your connection and try again." />;

  const endpoints = data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1
            className="fw-display"
            style={{ margin: 0, fontSize: 22, color: "var(--ink)", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span>🪝</span> Webhooks
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-dim)" }}>
            Receive real-time HTTP callbacks when events happen in your company.
          </p>
        </div>
        <button
          onClick={() => setFormTarget("new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <Icon d={I.plus} size={14} style={{ color: "#fff" }} />
          Add webhook
        </button>
      </div>

      {/* List */}
      {endpoints.length === 0 ? (
        <div
          className="fw-card"
          style={{
            padding: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            color: "var(--ink-faint)",
          }}
        >
          <span style={{ fontSize: 32 }}>🪝</span>
          <p style={{ margin: 0, fontSize: 14 }}>No webhook endpoints yet.</p>
          <button
            onClick={() => setFormTarget("new")}
            style={{
              marginTop: 4,
              padding: "7px 16px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink-dim)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Add your first webhook
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {endpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              onEdit={(e) => setFormTarget(e)}
              onSecret={setPendingSecret}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {formTarget !== null && (
        <EndpointForm
          initial={
            formTarget === "new"
              ? undefined
              : { name: formTarget.name, url: formTarget.url, events: formTarget.events }
          }
          loading={createMut.isPending || updateMut.isPending}
          onCancel={() => setFormTarget(null)}
          onSave={(v) => {
            if (formTarget === "new") {
              createMut.mutate(v);
            } else {
              updateMut.mutate({ id: formTarget.id, patch: v });
            }
          }}
        />
      )}

      {/* Secret reveal modal */}
      {pendingSecret && (
        <SecretModal secret={pendingSecret} onClose={() => setPendingSecret(null)} />
      )}
    </div>
  );
}
