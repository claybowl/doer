import * as React from "react";
import { useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { CompanyExport } from "../pages/CompanyExport";
import { Icon, I } from "./utils";

/**
 * Fernweh wrapper for the export page.
 *
 * Responsibilities:
 * 1. Sync the URL :companyPrefix param → selectedCompanyId so CompanyExport
 *    always has the right company, even on direct navigation.
 * 2. Provide a Fernweh-native chrome (header + full-height scroll container)
 *    so the Tailwind height-calc in CompanyExport doesn't fight the shell layout.
 */
export function FernwehCompanyExport() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();

  // Sync URL prefix → selected company whenever they diverge.
  React.useEffect(() => {
    if (!companyPrefix || !companies.length) return;
    const target = companies.find((c) => c.issuePrefix === companyPrefix);
    if (target && target.id !== selectedCompanyId) {
      setSelectedCompanyId(target.id);
    }
  }, [companyPrefix, companies, selectedCompanyId, setSelectedCompanyId]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Page header */}
      <div
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Icon d={I.arrow} size={16} />
        <h1
          className="fw-display"
          style={{ fontSize: 20, fontWeight: 700, margin: 0 }}
        >
          Company Export
        </h1>
      </div>

      {/* Scrollable content — CompanyExport owns its own inner layout */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <CompanyExport fernweh />
      </div>
    </div>
  );
}
