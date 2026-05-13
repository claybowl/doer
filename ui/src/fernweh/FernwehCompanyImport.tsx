import * as React from "react";
import { useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { CompanyImport } from "../pages/CompanyImport";
import { Icon, I } from "./utils";

/**
 * Fernweh wrapper for the import page.
 *
 * Syncs URL :companyPrefix → selectedCompanyId so CompanyImport
 * always has the right company even on direct navigation.
 */
export function FernwehCompanyImport() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();

  React.useEffect(() => {
    if (!companyPrefix || !companies.length) return;
    const target = companies.find((c) => c.issuePrefix === companyPrefix);
    if (target && target.id !== selectedCompanyId) {
      setSelectedCompanyId(target.id);
    }
  }, [companyPrefix, companies, selectedCompanyId, setSelectedCompanyId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        padding: "20px 32px", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <Icon d={I.arrow} size={16} />
        <h1 className="fw-display" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Company Import
        </h1>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
        <CompanyImport fernweh />
      </div>
    </div>
  );
}
