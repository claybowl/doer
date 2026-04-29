import * as React from "react";
import { CompanyExport } from "../pages/CompanyExport";
import { Icon, I } from "./utils";

export function FernwehCompanyExport() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        padding: "20px 32px", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <Icon d={I.arrow} size={16} />
        <h1 className="fw-display" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Company Export
        </h1>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
        <CompanyExport />
      </div>
    </div>
  );
}
