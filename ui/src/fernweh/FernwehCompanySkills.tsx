import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { companySkillsApi } from "@/api/companySkills";
import { queryKeys } from "@/lib/queryKeys";
import type {
  CompanySkillListItem,
  CompanySkillDetail,
  CompanySkillFileDetail,
  CompanySkillCreateRequest,
} from "@doerai/shared";
import { Icon, I, ErrorState, LoadingState } from "./utils";

/* ============================================================
   FernwehCompanySkills — company-wide skill management
   Left panel: filterable skill list + create/import actions
   Right panel: skill detail with file tree + editor
============================================================ */

type CompanySkillSourceBadge = "doer" | "github" | "local" | "url" | "catalog" | "skills_sh";

const SOURCE_BADGE_EMOJI: Record<CompanySkillSourceBadge, string> = {
  doer: "🔵",
  github: "⚫",
  local: "📁",
  url: "🌐",
  catalog: "📦",
  skills_sh: "🔧",
};

const FILE_KIND_EMOJI: Record<string, string> = {
  skill: "⭐",
  markdown: "📄",
  script: "⚙️",
  asset: "🖼️",
  ref: "🔗",
};
function fileEmoji(kind: string): string {
  return FILE_KIND_EMOJI[kind] ?? "📎";
}

// ---------- small shared styles ----------

const BTN_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--bg-raised)",
  color: "var(--ink)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  flexShrink: 0,
};

const BTN_PRIMARY: React.CSSProperties = {
  ...BTN_BASE,
  background: "var(--accent)",
  borderColor: "var(--accent)",
  color: "#fff",
};

const BTN_DANGER: React.CSSProperties = {
  ...BTN_BASE,
  background: "var(--danger)",
  borderColor: "var(--danger)",
  color: "#fff",
};

// ---------- modal overlay ----------

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.50)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="fw-card"
        style={{ width: 440, padding: "28px 28px 24px", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- CreateModal ----------

function CreateModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: (skillId: string) => void;
}) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [markdown, setMarkdown] = React.useState("");

  const mutation = useMutation({
    mutationFn: (payload: CompanySkillCreateRequest) =>
      companySkillsApi.create(companyId, payload),
    onSuccess: (skill) => {
      qc.invalidateQueries({ queryKey: queryKeys.companySkills.list(companyId) });
      pushToast({ title: "Skill created", tone: "success" });
      onCreated(skill.id);
    },
    onError: (err: Error) => pushToast({ title: err.message ?? "Failed to create skill", tone: "error" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate({
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      markdown: markdown.trim() || undefined,
    });
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--ink-faint)",
    marginBottom: 4,
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-sunken)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13,
    color: "var(--ink)",
    boxSizing: "border-box",
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span className="fw-display" style={{ fontSize: 16, fontWeight: 600 }}>New skill</span>
        <button style={{ ...BTN_BASE, padding: "4px 8px" }} onClick={onClose}>
          <Icon d={I.x} size={12} />
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Code Reviewer"
            required
            autoFocus
          />
        </div>
        <div>
          <label style={labelStyle}>Slug (optional)</label>
          <input
            style={inputStyle}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-derived from name"
          />
        </div>
        <div>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            style={{ ...inputStyle, height: 64, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this skill do?"
          />
        </div>
        <div>
          <label style={labelStyle}>Initial SKILL.md content (optional)</label>
          <textarea
            style={{ ...inputStyle, height: 100, resize: "vertical", fontFamily: "var(--fw-font-mono)", fontSize: 11 }}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder={"# My Skill\n\nDescribe what this skill teaches an agent to do.\n\n## Instructions\n\n- Step one\n- Step two"}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" style={BTN_BASE} onClick={onClose}>Cancel</button>
          <button type="submit" style={BTN_PRIMARY} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? "Creating…" : "Create skill"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ---------- ImportModal ----------

function ImportModal({
  companyId,
  onClose,
}: {
  companyId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [source, setSource] = React.useState("");

  const mutation = useMutation({
    mutationFn: () => companySkillsApi.importFromSource(companyId, source.trim()),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.companySkills.list(companyId) });
      const count = result.imported?.length ?? 0;
      pushToast({ title: `Imported ${count} skill${count !== 1 ? "s" : ""}`, tone: "success" });
      if (result.warnings?.length) {
        result.warnings.forEach((w) => pushToast({ title: w, tone: "warn" }));
      }
      onClose();
    },
    onError: (err: Error) => pushToast({ title: err.message ?? "Import failed", tone: "error" }),
  });

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span className="fw-display" style={{ fontSize: 16, fontWeight: 600 }}>Import skill</span>
        <button style={{ ...BTN_BASE, padding: "4px 8px" }} onClick={onClose}>
          <Icon d={I.x} size={12} />
        </button>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (source.trim()) mutation.mutate(); }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 4, display: "block" }}>
            Source
          </label>
          <input
            style={{ width: "100%", background: "var(--bg-sunken)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "var(--ink)", boxSizing: "border-box" }}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={'github:org/repo/path  or  https://github.com/...  or  /local/path'}
            autoFocus
            required
          />
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>
            Supports GitHub URLs, <span className="fw-mono">github:org/repo</span> shorthand, HTTPS URLs, or local paths.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" style={BTN_BASE} onClick={onClose}>Cancel</button>
          <button type="submit" style={BTN_PRIMARY} disabled={mutation.isPending || !source.trim()}>
            {mutation.isPending ? "Importing…" : "Import"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ---------- UpdateStatusBadge ----------

function UpdateStatusBadge({
  companyId,
  skillId,
  onInstalled,
}: {
  companyId: string;
  skillId: string;
  onInstalled: () => void;
}) {
  const { pushToast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.companySkills.updateStatus(companyId, skillId),
    queryFn: () => companySkillsApi.updateStatus(companyId, skillId),
  });

  const installMutation = useMutation({
    mutationFn: () => companySkillsApi.installUpdate(companyId, skillId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companySkills.detail(companyId, skillId) });
      qc.invalidateQueries({ queryKey: queryKeys.companySkills.list(companyId) });
      qc.invalidateQueries({ queryKey: queryKeys.companySkills.updateStatus(companyId, skillId) });
      pushToast({ title: "Update installed", tone: "success" });
      onInstalled();
    },
    onError: (err: Error) => pushToast({ title: err.message ?? "Install failed", tone: "error" }),
  });

  if (!data?.hasUpdate) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "color-mix(in oklab, var(--warn) 8%, var(--bg-raised))", border: "1px solid color-mix(in oklab, var(--warn) 30%, var(--line))", borderRadius: 8, fontSize: 12 }}>
      <span style={{ color: "var(--warn)", fontWeight: 600 }}>Update available</span>
      {data.latestRef && (
        <span className="fw-mono" style={{ color: "var(--ink-dim)", fontSize: 11 }}>{data.latestRef.slice(0, 7)}</span>
      )}
      <button
        style={{ ...BTN_BASE, padding: "3px 10px", fontSize: 11 }}
        onClick={() => installMutation.mutate()}
        disabled={installMutation.isPending}
      >
        {installMutation.isPending ? "Installing…" : "Install update"}
      </button>
    </div>
  );
}

// ---------- FileViewer ----------

function FileViewer({
  companyId,
  skillId,
  path,
}: {
  companyId: string;
  skillId: string;
  path: string;
}) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [editMode, setEditMode] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);

  const { data, isLoading, error } = useQuery<CompanySkillFileDetail>({
    queryKey: queryKeys.companySkills.file(companyId, skillId, path),
    queryFn: () => companySkillsApi.file(companyId, skillId, path),
    enabled: !!path,
  });

  React.useEffect(() => {
    setEditMode(false);
    setDraft(null);
  }, [path]);

  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      companySkillsApi.updateFile(companyId, skillId, path, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companySkills.file(companyId, skillId, path) });
      pushToast({ title: "Saved", tone: "success" });
      setEditMode(false);
      setDraft(null);
    },
    onError: (err: Error) => pushToast({ title: err.message ?? "Save failed", tone: "error" }),
  });

  if (isLoading) return <LoadingState label="Loading file…" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const content = draft ?? data.content ?? "";
  const isDirty = draft !== null && draft !== (data.content ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* file header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid var(--line)", background: "var(--bg-sunken)", flexShrink: 0 }}>
        <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {path}
        </span>
        {data.editable && !editMode && (
          <button style={BTN_BASE} onClick={() => { setDraft(data.content ?? ""); setEditMode(true); }}>
            Edit
          </button>
        )}
        {editMode && (
          <>
            <button
              style={BTN_PRIMARY}
              disabled={saveMutation.isPending || !isDirty}
              onClick={() => saveMutation.mutate(content)}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              style={BTN_BASE}
              onClick={() => { setDraft(null); setEditMode(false); }}
            >
              Discard
            </button>
          </>
        )}
      </div>

      {/* file body */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {editMode ? (
          <textarea
            style={{ width: "100%", height: "100%", minHeight: 320, background: "var(--bg)", border: "none", outline: "none", padding: "14px 16px", fontSize: 12, fontFamily: "var(--fw-font-mono)", color: "var(--ink)", resize: "none", boxSizing: "border-box" }}
            value={content}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12, fontFamily: "var(--fw-font-mono)", color: "var(--ink)", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
            {data.content ?? ""}
          </pre>
        )}
      </div>
    </div>
  );
}

// ---------- SkillDetail ----------

function SkillDetail({
  companyId,
  skillId,
  prefix,
}: {
  companyId: string;
  skillId: string;
  prefix: string;
}) {
  const { data: detail, isLoading, error } = useQuery<CompanySkillDetail>({
    queryKey: queryKeys.companySkills.detail(companyId, skillId),
    queryFn: () => companySkillsApi.detail(companyId, skillId),
    enabled: !!skillId,
  });

  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);

  // Select first file when detail loads or skill changes
  React.useEffect(() => {
    if (detail?.fileInventory?.length) {
      setSelectedFile(detail.fileInventory[0].path);
    } else {
      setSelectedFile(null);
    }
  }, [skillId, detail?.fileInventory]);

  if (isLoading) return <LoadingState label="Loading skill…" />;
  if (error) return <ErrorState error={error} />;
  if (!detail) return null;

  const badge = detail.sourceBadge as CompanySkillSourceBadge;
  const badgeEmoji = SOURCE_BADGE_EMOJI[badge] ?? "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* header */}
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22 }}>{badgeEmoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="fw-display" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              {detail.name}
            </h2>
            {detail.sourceLocator && (
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {detail.sourceLocator}
              </span>
            )}
          </div>
        </div>

        {/* chips row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          <span className="fw-chip" style={{ color: detail.editable ? "var(--accent)" : "var(--ink-faint)" }}>
            {detail.editable ? "Editable" : "Read-only"}
          </span>
          {detail.sourceLabel && (
            <span className="fw-chip" style={{ color: "var(--ink-dim)" }}>
              {detail.sourceLabel}
            </span>
          )}
          <span className="fw-chip" style={{ color: "var(--ink-dim)" }}>
            <Icon d={I.user_plus} size={10} />
            {detail.attachedAgentCount ?? detail.usedByAgents?.length ?? 0} agent{(detail.attachedAgentCount ?? detail.usedByAgents?.length ?? 0) !== 1 ? "s" : ""}
          </span>
          {detail.trustLevel && (
            <span className="fw-chip" style={{ color: "var(--ink-faint)" }}>
              {detail.trustLevel}
            </span>
          )}
        </div>

        {detail.description && (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.5 }}>
            {detail.description}
          </p>
        )}

        {badge === "github" && (
          <div style={{ marginTop: 10 }}>
            <UpdateStatusBadge
              companyId={companyId}
              skillId={skillId}
              onInstalled={() => {}}
            />
          </div>
        )}
      </div>

      {/* body: file tree + content */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* file tree */}
        <div style={{ width: 180, flexShrink: 0, borderRight: "1px solid var(--line)", overflowY: "auto", padding: "8px 0" }}>
          {detail.fileInventory?.length ? (
            detail.fileInventory.map((f) => (
              <button
                key={f.path}
                onClick={() => setSelectedFile(f.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  padding: "6px 12px",
                  background: selectedFile === f.path ? "var(--bg-sunken)" : "transparent",
                  border: "none",
                  borderLeft: selectedFile === f.path ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  color: selectedFile === f.path ? "var(--ink)" : "var(--ink-dim)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={f.path}
              >
                <span style={{ flexShrink: 0 }}>{fileEmoji(f.kind)}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.path.split("/").pop() ?? f.path}
                </span>
              </button>
            ))
          ) : (
            <p style={{ padding: "12px", fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>No files</p>
          )}
        </div>

        {/* file content */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {selectedFile ? (
            <FileViewer companyId={companyId} skillId={skillId} path={selectedFile} />
          ) : (
            <div style={{ padding: 24, color: "var(--ink-faint)", fontSize: 13 }}>Select a file</div>
          )}
        </div>
      </div>

      {/* agents using this skill */}
      {detail.usedByAgents?.length ? (
        <div style={{ borderTop: "1px solid var(--line)", padding: "14px 22px", flexShrink: 0 }}>
          <p className="fw-uc" style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 8 }}>
            Agents using this skill
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {detail.usedByAgents.map((a) => (
              <span key={a.id} className="fw-chip" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon d={I.brain} size={10} />
                <span>{a.name}</span>
                {a.adapterType && (
                  <span className="fw-mono" style={{ color: "var(--ink-faint)", fontSize: 10 }}>
                    {a.adapterType}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- SkillListItem ----------

function SkillListItem({
  skill,
  active,
  onClick,
}: {
  skill: CompanySkillListItem;
  active: boolean;
  onClick: () => void;
}) {
  const badge = skill.sourceBadge as CompanySkillSourceBadge;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        padding: "9px 12px",
        background: active ? "var(--bg-sunken)" : "transparent",
        border: "none",
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
        <span style={{ flexShrink: 0, fontSize: 13 }}>{SOURCE_BADGE_EMOJI[badge] ?? "?"}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: active ? "var(--ink)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {skill.name}
        </span>
        {(skill.attachedAgentCount ?? 0) > 0 && (
          <span className="fw-chip" style={{ fontSize: 10, padding: "1px 6px", flexShrink: 0 }}>
            {skill.attachedAgentCount}
          </span>
        )}
      </div>
      {skill.description && (
        <span style={{ fontSize: 11, color: "var(--ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 20 }}>
          {skill.description}
        </span>
      )}
    </button>
  );
}

// ---------- FernwehCompanySkills (main export) ----------

export function FernwehCompanySkills() {
  const { selectedCompany } = useCompany();
  const params = useParams<{ skillId?: string; companyPrefix?: string }>();
  const navigate = useNavigate();

  const companyId = selectedCompany?.id ?? "";
  const prefix = params.companyPrefix ?? selectedCompany?.issuePrefix ?? "";
  const skillId = params.skillId;

  const [filter, setFilter] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);

  const { data: skills, isLoading, error } = useQuery<CompanySkillListItem[]>({
    queryKey: queryKeys.companySkills.list(companyId),
    queryFn: () => companySkillsApi.list(companyId),
    enabled: !!companyId,
  });

  const filtered = React.useMemo(() => {
    if (!skills) return [];
    const q = filter.toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.key?.toLowerCase().includes(q),
    );
  }, [skills, filter]);

  const handleSelect = (id: string) => {
    navigate(`/${prefix}/fernweh/company/skills/${id}`);
  };

  const handleCreated = (newSkillId: string) => {
    setShowCreate(false);
    navigate(`/${prefix}/fernweh/company/skills/${newSkillId}`);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--bg)" }}>
      {/* ---- left panel ---- */}
      <div style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* panel header */}
        <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid var(--line-soft)", flexShrink: 0 }}>
          <p className="fw-uc" style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 8 }}>
            Company Skills
          </p>
          {/* filter */}
          <input
            style={{ width: "100%", background: "var(--bg-sunken)", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 9px", fontSize: 12, color: "var(--ink)", boxSizing: "border-box", marginBottom: 8 }}
            placeholder="Filter skills…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {/* actions */}
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...BTN_PRIMARY, flex: 1, justifyContent: "center", fontSize: 11, padding: "5px 8px" }} onClick={() => setShowCreate(true)}>
              <Icon d={I.plus} size={11} />
              New
            </button>
            <button style={{ ...BTN_BASE, flex: 1, justifyContent: "center", fontSize: 11, padding: "5px 8px" }} onClick={() => setShowImport(true)}>
              Import
            </button>
          </div>
        </div>

        {/* skill list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isLoading && <LoadingState label="Loading skills…" />}
          {error && <ErrorState error={error} />}
          {!isLoading && !error && filtered.length === 0 && (
            <p style={{ padding: "16px 12px", fontSize: 12, color: "var(--ink-faint)" }}>
              {filter ? "No matches" : "No skills yet"}
            </p>
          )}
          {filtered.map((s) => (
            <SkillListItem
              key={s.id}
              skill={s}
              active={s.id === skillId}
              onClick={() => handleSelect(s.id)}
            />
          ))}
        </div>
      </div>

      {/* ---- right panel ---- */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!skillId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--ink-faint)" }}>
              <Icon d={I.brain} size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Select a skill</p>
              <p style={{ fontSize: 12, margin: "6px 0 0", color: "var(--ink-faint)" }}>
                Choose from the list, or create a new one
              </p>
            </div>
          </div>
        ) : (
          <SkillDetail companyId={companyId} skillId={skillId} prefix={prefix} />
        )}
      </div>

      {/* ---- modals ---- */}
      {showCreate && (
        <CreateModal companyId={companyId} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {showImport && (
        <ImportModal companyId={companyId} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}

export default FernwehCompanySkills;
