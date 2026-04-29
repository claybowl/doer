import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@/lib/router";
import { portalApi } from "@/api/deliverables";
import type {
  Deliverable,
  DeliverableKind,
  PortalResolveResponse,
  ResolvedPortalBranding,
} from "@doerai/shared";
import { ApiError } from "@/api/client";

/* ============================================================
   PortalPage — the unauthenticated /portal/:token landing.

   This is what a share-link recipient sees. Zero Doer chrome:
   no Fernweh sidebar, no auth prompt, just a clean branded page
   listing the files they've been given access to, each with a
   download button.

   Purely read-only. If the token is invalid / expired / revoked,
   we render a dead-simple "link not valid" message with no extra
   branding leakage. If the token resolves, we inject the
   company's branding vars and render the files as cards.

   v1 uses Donjon defaults via PORTAL_BRANDING_DEFAULTS merged
   with any per-company overrides from company_portal_branding.
   Per-company logos come through company_logos -> assets via the
   server resolver.
============================================================ */

const KIND_LABELS: Record<DeliverableKind | "_default", string> = {
  docx: "Word document",
  xlsx: "Excel spreadsheet",
  pdf: "PDF",
  pptx: "Presentation",
  md: "Markdown",
  png: "Image (PNG)",
  jpg: "Image (JPEG)",
  csv: "CSV",
  html: "HTML",
  json: "JSON",
  other: "File",
  _default: "File",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind as DeliverableKind] ?? KIND_LABELS._default;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PortalPage() {
  const { token } = useParams<{ token: string }>();

  const resolveQuery = useQuery<PortalResolveResponse, Error>({
    queryKey: ["portal", token],
    queryFn: () => portalApi.resolve(token!),
    enabled: !!token,
    retry: false,
  });

  if (!token) {
    return <PortalErrorShell title="Invalid link" subtitle="No share token was provided." />;
  }

  if (resolveQuery.isLoading) {
    return (
      <PortalErrorShell
        title="Loading…"
        subtitle="Checking the share link."
      />
    );
  }

  if (resolveQuery.error) {
    const message = classifyError(resolveQuery.error);
    return <PortalErrorShell title={message.title} subtitle={message.subtitle} />;
  }

  const data = resolveQuery.data;
  if (!data) {
    return (
      <PortalErrorShell
        title="Link not valid"
        subtitle="This share link doesn't resolve to any files."
      />
    );
  }

  return <PortalShell data={data} token={token} />;
}

// ---------- shell ----------

function PortalShell({
  data,
  token,
}: {
  data: PortalResolveResponse;
  token: string;
}) {
  const { branding } = data.company;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: branding.backgroundColor,
        color: "rgba(255,255,255,0.92)",
        fontFamily: branding.fontFamily,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header branding={branding} />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          padding: "40px 24px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Shared with you · {data.deliverables.length} file
            {data.deliverables.length === 1 ? "" : "s"}
          </span>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {branding.displayName}
          </h1>
          {branding.tagline ? (
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
                margin: 0,
                maxWidth: 560,
              }}
            >
              {branding.tagline}
            </p>
          ) : null}
        </section>

        {data.deliverables.length === 0 ? (
          <EmptyState branding={branding} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            {data.deliverables.map((d) => (
              <FileCard
                key={d.id}
                deliverable={d}
                token={token}
                branding={branding}
              />
            ))}
          </div>
        )}

        {data.token.expiresAt ? (
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              marginTop: 12,
            }}
          >
            This link expires {formatDate(data.token.expiresAt)}.
          </p>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

function Header({ branding }: { branding: ResolvedPortalBranding }) {
  return (
    <header
      style={{
        padding: "18px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: branding.surfaceColor,
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: "100%",
      }}
    >
      <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.displayName}
            style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: branding.primaryColor,
              color: branding.backgroundColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {branding.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {branding.displayName}
        </span>
      </div>
    </header>
  );
}

function FileCard({
  deliverable,
  token,
  branding,
}: {
  deliverable: Deliverable;
  token: string;
  branding: ResolvedPortalBranding;
}) {
  const downloadUrl = `/api/portal/${token}/deliverables/${deliverable.id}/download`;

  return (
    <article
      style={{
        padding: 18,
        borderRadius: 12,
        background: branding.surfaceColor,
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "transform .15s ease, border-color .15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: branding.primaryColor,
            color: branding.backgroundColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {deliverable.kind.slice(0, 4)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              color: "rgba(255,255,255,0.95)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {deliverable.title}
          </h3>
          <span
            style={{
              fontSize: 11.5,
              color: "rgba(255,255,255,0.55)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {deliverable.filename}
          </span>
        </div>
      </div>

      {deliverable.description ? (
        <p
          style={{
            fontSize: 12.5,
            color: "rgba(255,255,255,0.7)",
            margin: 0,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {deliverable.description}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          paddingTop: 6,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span>
          {kindLabel(deliverable.kind)} · {formatBytes(deliverable.sizeBytes)}
        </span>
        <span>{formatDate(deliverable.producedAt)}</span>
      </div>

      <a
        href={downloadUrl}
        download={deliverable.filename}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "9px 14px",
          borderRadius: 8,
          background: branding.primaryColor,
          color: branding.backgroundColor,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Download
      </a>
    </article>
  );
}

function EmptyState({ branding }: { branding: ResolvedPortalBranding }) {
  return (
    <div
      style={{
        padding: "60px 24px",
        textAlign: "center",
        background: branding.surfaceColor,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
        No files yet
      </span>
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", maxWidth: 420 }}>
        This share link is active but has no published files to show. Check
        back later, or contact the sender.
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer
      style={{
        padding: "24px",
        textAlign: "center",
        fontSize: 10.5,
        color: "rgba(255,255,255,0.35)",
      }}
    >
      Powered by Doer
    </footer>
  );
}

// ---------- error shell (no branding leakage) ----------

function PortalErrorShell({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "oklch(0.17 0.012 60)",
        color: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          "'Inter Tight', ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "rgba(255,255,255,0.6)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
        <span
          style={{
            marginTop: 8,
            fontSize: 10.5,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          Powered by Doer
        </span>
      </div>
    </div>
  );
}

function classifyError(err: Error): { title: string; subtitle: string } {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      return {
        title: "Link not found",
        subtitle:
          "This share link doesn't exist. The URL may be mistyped, or the sender has revoked it.",
      };
    }
    if (err.status === 403) {
      // Message from server distinguishes expired vs revoked. Show it.
      const msg = err.message.toLowerCase();
      if (msg.includes("expired")) {
        return {
          title: "Link expired",
          subtitle:
            "This share link has expired. Contact the sender for a fresh link.",
        };
      }
      if (msg.includes("revoked")) {
        return {
          title: "Link revoked",
          subtitle:
            "This share link has been revoked. Contact the sender if you still need access.",
        };
      }
      return {
        title: "Access denied",
        subtitle: err.message,
      };
    }
  }
  return {
    title: "Something went wrong",
    subtitle: err.message || "Please try again in a moment.",
  };
}
