import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { companiesApi } from "@/api/companies";
import { assetsApi } from "@/api/assets";
import { queryKeys } from "@/lib/queryKeys";
import { Icon, I, ErrorState, LoadingState } from "./utils";

/* ============================================================
   FernwehCompanyBranding — identity + visual brand settings.
   Route: /:companyPrefix/company/branding

   Two sections:
   1. Identity  — name, description  (save button)
   2. Visual    — brand color, logo  (logo changes are immediate;
                                      color+name+desc share one save)
============================================================ */

// ── Shared field styles ───────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-sunken)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--ink)",
  boxSizing: "border-box",
  outline: "none",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--ink-faint)",
  marginBottom: 5,
};

const HINT: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ink-faint)",
  marginTop: 4,
  lineHeight: 1.4,
};

const CARD: React.CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const BTN_PRIMARY: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const BTN_GHOST: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--bg-raised)",
  color: "var(--ink)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const BTN_DANGER: React.CSSProperties = {
  ...BTN_GHOST,
  color: "var(--danger)",
  borderColor: "color-mix(in oklab, var(--danger) 30%, var(--line))",
};

// ── Color swatch preview ──────────────────────────────────────

function ColorPreview({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: color || "var(--bg-sunken)",
        border: "1px solid var(--line)",
        flexShrink: 0,
      }}
    />
  );
}

// ── Logo upload zone ──────────────────────────────────────────

function LogoUploadZone({
  companyId,
  logoUrl,
  onUpload,
  onRemove,
  uploading,
  removing,
}: {
  companyId: string;
  logoUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
  removing: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    onUpload(file);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Current logo */}
      {logoUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={logoUrl}
            alt="Company logo"
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--bg-sunken)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>Current logo</span>
            <button
              style={BTN_DANGER}
              disabled={removing}
              onClick={onRemove}
            >
              {removing ? "Removing…" : "Remove logo"}
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--accent)" : "var(--line)"}`,
          borderRadius: 10,
          padding: "20px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "color-mix(in oklab, var(--accent) 6%, var(--bg-sunken))" : "var(--bg-sunken)",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>Uploading…</span>
        ) : (
          <>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🖼️</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-dim)" }}>
              Drop an image here, or click to browse
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-faint)" }}>
              PNG, JPEG, WEBP, GIF, or SVG
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function FernwehCompanyBranding() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { pushToast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const companyId = selectedCompanyId ?? "";
  const prefix = selectedCompany?.issuePrefix ?? "";

  const { data: company, isLoading, error } = useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: () => companiesApi.get(companyId),
    enabled: !!companyId,
  });

  // Local draft state — initialised from query data
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [brandColor, setBrandColor] = React.useState("");

  // Sync drafts when company data loads
  React.useEffect(() => {
    if (!company) return;
    setName(company.name ?? "");
    setDescription(company.description ?? "");
    setBrandColor(company.brandColor ?? "");
  }, [company]);

  // Dirty check
  const isDirty =
    name !== (company?.name ?? "") ||
    description !== (company?.description ?? "") ||
    brandColor !== (company?.brandColor ?? "");

  // ── Save identity + color ──────────────────────────────────

  const saveMut = useMutation({
    mutationFn: () =>
      companiesApi.updateBranding(companyId, {
        name: name.trim() || undefined,
        description: description.trim() || null,
        brandColor: brandColor.trim() || null,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.companies.detail(companyId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.companies.all });
      pushToast({ title: "Branding saved", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: err.message ?? "Save failed", tone: "error" }),
  });

  // ── Logo upload ────────────────────────────────────────────

  const logoUploadMut = useMutation({
    mutationFn: async (file: File) => {
      const asset = await assetsApi.uploadCompanyLogo(companyId, file);
      return companiesApi.update(companyId, { logoAssetId: asset.assetId });
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.companies.detail(companyId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.companies.all });
      pushToast({ title: "Logo updated", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: err.message ?? "Upload failed", tone: "error" }),
  });

  // ── Logo remove ────────────────────────────────────────────

  const logoRemoveMut = useMutation({
    mutationFn: () => companiesApi.update(companyId, { logoAssetId: null }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.companies.detail(companyId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.companies.all });
      pushToast({ title: "Logo removed", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: err.message ?? "Remove failed", tone: "error" }),
  });

  if (isLoading) return <LoadingState label="Loading branding…" />;
  if (error || !company) return <ErrorState error={error ?? "Company not found"} />;

  const colorForPreview = brandColor.trim() || company.brandColor || "var(--accent)";

  return (
    <div style={{ maxWidth: 620, padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => navigate(`/${prefix}/company`)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-dim)", padding: 0, display: "flex", alignItems: "center" }}
        >
          <Icon d={I.arrow} size={14} style={{ transform: "rotate(180deg)" }} />
        </button>
        <h1 className="fw-display" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
          Branding
        </h1>
      </div>

      {/* ── Identity card ── */}
      <div style={CARD}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Identity</h2>

        <div>
          <label style={LABEL}>Company name</label>
          <input
            style={INPUT}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={company.name}
          />
          <p style={HINT}>Shown in the nav, invites, and exported content.</p>
        </div>

        <div>
          <label style={LABEL}>Description</label>
          <textarea
            style={{ ...INPUT, minHeight: 72, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this company do?"
          />
          <p style={HINT}>Optional. Shown on the company card and in exports.</p>
        </div>

        {/* ── Brand color inside identity card ── */}
        <div>
          <label style={LABEL}>Brand color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ColorPreview color={colorForPreview} />
            <input
              type="color"
              value={brandColor || "#6366f1"}
              onChange={(e) => setBrandColor(e.target.value)}
              style={{
                width: 36,
                height: 36,
                padding: 2,
                border: "1px solid var(--line)",
                borderRadius: 8,
                cursor: "pointer",
                background: "var(--bg-sunken)",
              }}
            />
            <input
              style={{ ...INPUT, flex: 1 }}
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#6366f1"
              maxLength={7}
              className="fw-mono"
            />
            {brandColor && (
              <button
                style={BTN_GHOST}
                onClick={() => setBrandColor("")}
              >
                Clear
              </button>
            )}
          </div>
          <p style={HINT}>Sets the hue for the company icon. Leave empty for auto-generated color.</p>
        </div>

        {/* Save row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
          {isDirty && (
            <button
              style={BTN_GHOST}
              onClick={() => {
                setName(company.name ?? "");
                setDescription(company.description ?? "");
                setBrandColor(company.brandColor ?? "");
              }}
            >
              Discard
            </button>
          )}
          <button
            style={{ ...BTN_PRIMARY, opacity: (!isDirty || saveMut.isPending) ? 0.5 : 1 }}
            disabled={!isDirty || saveMut.isPending || !name.trim()}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Logo card ── */}
      <div style={CARD}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Logo</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-faint)" }}>
            Shown in invites, exported board pages, and the company switcher.
          </p>
        </div>

        <LogoUploadZone
          companyId={companyId}
          logoUrl={company.logoUrl}
          onUpload={(file) => logoUploadMut.mutate(file)}
          onRemove={() => logoRemoveMut.mutate()}
          uploading={logoUploadMut.isPending}
          removing={logoRemoveMut.isPending}
        />
      </div>

      {/* Issue prefix (read-only info) */}
      <div style={CARD}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Issue prefix</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="fw-mono" style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--accent)",
            padding: "6px 14px",
            background: "color-mix(in oklab, var(--accent) 10%, var(--bg-sunken))",
            borderRadius: 8,
            border: "1px solid color-mix(in oklab, var(--accent) 25%, var(--line))",
            letterSpacing: "0.05em",
          }}>
            {company.issuePrefix}
          </span>
          <p style={{ ...HINT, margin: 0 }}>
            Read-only. Prefixes all issue keys (e.g. <span className="fw-mono">{company.issuePrefix}-42</span>). Contact instance admin to rename.
          </p>
        </div>
      </div>
    </div>
  );
}
