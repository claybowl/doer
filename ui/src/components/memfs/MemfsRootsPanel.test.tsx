// @vitest-environment node

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MemfsRootDTO } from "@paperclipai/shared";
import { queryKeys } from "../../lib/queryKeys";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MemfsRootsPanel } from "./MemfsRootsPanel";

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Never fetch during tests — every render pre-seeds its own cache.
        queryFn: () => new Promise(() => undefined),
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });
}

const COMPANY_ID = "company-ut-1";

describe("MemfsRootsPanel", () => {
  it("renders the empty-state message when the company has no roots", () => {
    const qc = makeClient();
    qc.setQueryData<MemfsRootDTO[]>(queryKeys.memfs.roots(COMPANY_ID), []);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <MemfsRootsPanel companyId={COMPANY_ID} />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(html).toContain("Memory Roots");
    expect(html).toContain("No memory roots yet. Declare one below.");
    expect(html).toContain("Add a new root");
    // Form is visible; the submit button should render its idle copy.
    expect(html).toContain("Add root");
  });

  it("renders each root's label, kind (uppercased), and path", () => {
    const qc = makeClient();
    const roots: MemfsRootDTO[] = [
      {
        id: "root-1",
        companyId: COMPANY_ID,
        kind: "local-fs",
        rootPath: "/Users/clay/.letta",
        label: "letta",
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
      {
        id: "root-2",
        companyId: COMPANY_ID,
        kind: "mcp",
        rootPath: "mcp://notion/workspace",
        label: "notion",
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
    ];
    qc.setQueryData<MemfsRootDTO[]>(queryKeys.memfs.roots(COMPANY_ID), roots);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <MemfsRootsPanel companyId={COMPANY_ID} />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    // Empty-state message must not appear when data exists.
    expect(html).not.toContain("No memory roots yet");

    // Labels
    expect(html).toContain(">letta<");
    expect(html).toContain(">notion<");

    // Kinds are shown raw in markup; the `uppercase` Tailwind class handles
    // the visual transform, so we assert the class and the literal kind value.
    expect(html).toContain("uppercase");
    expect(html).toContain(">local-fs<");
    expect(html).toContain(">mcp<");

    // Paths appear inside the monospace span.
    expect(html).toContain("/Users/clay/.letta");
    expect(html).toContain("mcp://notion/workspace");
  });
});
