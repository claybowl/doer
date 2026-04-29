// @vitest-environment node

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MemfsBindingDTO, MemfsRootDTO } from "@doerai/shared";
import { queryKeys } from "../../lib/queryKeys";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MemfsBindingsPanel } from "./MemfsBindingsPanel";

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: () => new Promise(() => undefined),
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });
}

const COMPANY_ID = "company-ut-1";
const AGENT_ID = "agent-ut-1";

const rootLetta: MemfsRootDTO = {
  id: "root-letta",
  companyId: COMPANY_ID,
  kind: "local-fs",
  rootPath: "/Users/clay/.letta",
  label: "letta",
  createdAt: "2026-04-18T00:00:00.000Z",
  updatedAt: "2026-04-18T00:00:00.000Z",
};

describe("MemfsBindingsPanel", () => {
  it("warns when the company has no roots declared yet", () => {
    const qc = makeClient();
    qc.setQueryData<MemfsRootDTO[]>(queryKeys.memfs.roots(COMPANY_ID), []);
    qc.setQueryData<MemfsBindingDTO[]>(
      queryKeys.memfs.bindingsForAgent(COMPANY_ID, AGENT_ID),
      [],
    );

    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <MemfsBindingsPanel companyId={COMPANY_ID} agentId={AGENT_ID} />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(html).toContain("Memory");
    expect(html).toContain("Active bindings");
    expect(html).toContain("No bindings yet. Add one below.");
    expect(html).toContain(
      "No memory roots declared for this company yet.",
    );
    expect(html).toContain("Company Settings → Memory Roots");
  });

  it("renders each binding's strategy, permission, resolved path, and mount label", () => {
    const qc = makeClient();
    qc.setQueryData<MemfsRootDTO[]>(
      queryKeys.memfs.roots(COMPANY_ID),
      [rootLetta],
    );
    const bindings: MemfsBindingDTO[] = [
      {
        id: "binding-1",
        agentId: AGENT_ID,
        rootId: rootLetta.id,
        pathPrefix: "agents/abc-123/memory",
        strategy: "fs-mount",
        permission: "read",
        mountAs: null,
        label: "primary",
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
      {
        id: "binding-2",
        agentId: AGENT_ID,
        rootId: rootLetta.id,
        pathPrefix: "agents/abc-123/archival",
        strategy: "native-letta",
        permission: "read-write",
        mountAs: ".letta-archival",
        label: null,
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
    ];
    qc.setQueryData<MemfsBindingDTO[]>(
      queryKeys.memfs.bindingsForAgent(COMPANY_ID, AGENT_ID),
      bindings,
    );

    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <MemfsBindingsPanel companyId={COMPANY_ID} agentId={AGENT_ID} />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    // Empty-state + roots-missing warning must NOT appear.
    expect(html).not.toContain("No bindings yet. Add one below.");
    expect(html).not.toContain(
      "No memory roots declared for this company yet.",
    );
    expect(html).not.toContain("(root missing)");

    // Binding 1: uses binding.label, default mountAs → `.memory/<label>`.
    expect(html).toContain(">primary<");
    expect(html).toContain(">fs-mount<");
    expect(html).toContain(">read<");
    expect(html).toContain("/Users/clay/.letta");
    expect(html).toContain("agents/abc-123/memory");
    expect(html).toContain(".memory/primary");

    // Binding 2: explicit mountAs override, falls back to root.label for display.
    expect(html).toContain(">native-letta<");
    expect(html).toContain(">read-write<");
    expect(html).toContain("agents/abc-123/archival");
    expect(html).toContain(".letta-archival");
    // When both binding.label and root lookup succeed, binding 2 shows the
    // root's label as the display name since binding.label is null.
    expect(html).toContain(">letta<");
  });

  it("flags bindings whose root is missing", () => {
    const qc = makeClient();
    qc.setQueryData<MemfsRootDTO[]>(queryKeys.memfs.roots(COMPANY_ID), [
      rootLetta,
    ]);
    const orphan: MemfsBindingDTO = {
      id: "binding-orphan",
      agentId: AGENT_ID,
      rootId: "root-that-was-deleted",
      pathPrefix: "agents/ghost/memory",
      strategy: "fs-mount",
      permission: "read",
      mountAs: null,
      label: "orphaned",
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z",
    };
    qc.setQueryData<MemfsBindingDTO[]>(
      queryKeys.memfs.bindingsForAgent(COMPANY_ID, AGENT_ID),
      [orphan],
    );

    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <MemfsBindingsPanel companyId={COMPANY_ID} agentId={AGENT_ID} />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(html).toContain("(root missing)");
    expect(html).toContain("agents/ghost/memory");
    // The orphan branch renders `(root missing)` *immediately before* the
    // pathPrefix — i.e. the resolved-path branch (rootPath + "/" + pathPrefix)
    // is NOT taken. We can't assert the root path is absent wholesale because
    // the Root <select> dropdown still lists it as an option.
    const orphanMarkerIdx = html.indexOf("(root missing)");
    const prefixIdx = html.indexOf("agents/ghost/memory");
    expect(orphanMarkerIdx).toBeGreaterThanOrEqual(0);
    expect(prefixIdx).toBeGreaterThan(orphanMarkerIdx);
  });
});
