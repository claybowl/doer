// packages/plugins/council/src/ui/CouncilSidebarLink.tsx
import type { PluginSidebarProps } from "@doerai/plugin-sdk/ui";

export function CouncilSidebarLink({ context }: PluginSidebarProps) {
  const href = `/${context.companyPrefix ?? ""}/council`;
  const isActive =
    typeof window !== "undefined" && window.location.pathname.includes("/council");

  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: "var(--radius)",
        fontSize: 14,
        color: isActive ? "var(--accent-foreground)" : "var(--muted-foreground)",
        background: isActive ? "var(--accent)" : "none",
        textDecoration: "none",
      }}
    >
      🏛️ Council
    </a>
  );
}
