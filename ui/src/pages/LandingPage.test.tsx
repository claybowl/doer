// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// Mock @/lib/router to avoid CompanyProvider dependency
vi.mock("@/lib/router", () => {
  const RouterDom = require("react-router-dom");
  return {
    ...RouterDom,
    Link: RouterDom.Link,
    NavLink: RouterDom.NavLink,
    Navigate: RouterDom.Navigate,
  };
});

import { LandingPage } from "./LandingPage";

function renderLandingPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe("LandingPage", () => {
  it("renders the hero section with value proposition", () => {
    const html = renderLandingPage();
    expect(html).toContain("Your AI workforce");
    expect(html).toContain("Ready in 5 minutes");
  });

  it("renders a Start Free CTA in the hero", () => {
    const html = renderLandingPage();
    expect(html).toContain("Start Free");
  });

  it("renders the Features section with all four key features", () => {
    const html = renderLandingPage();
    expect(html).toContain("Agent Creation");
    expect(html).toContain("Task Management");
    expect(html).toContain("Deliverables");
    expect(html).toContain("Multi-Agent Coordination");
  });

  it("renders the How It Works section with three steps", () => {
    const html = renderLandingPage();
    expect(html).toContain("Create your agents");
    expect(html).toContain("Assign tasks");
    expect(html).toContain("Watch them work");
  });

  it("renders the Pricing section with tiers", () => {
    const html = renderLandingPage();
    expect(html).toContain("Pricing");
    expect(html).toContain("Free");
    expect(html).toContain("Pro");
  });

  it("renders the Comparison table", () => {
    const html = renderLandingPage();
    expect(html).toContain("How we compare");
  });

  it("renders the Use Cases section", () => {
    const html = renderLandingPage();
    expect(html).toContain("Who uses Doer");
    expect(html).toContain("Startup founders");
    expect(html).toContain("Content teams");
  });

  it("renders the Social Proof section with testimonials", () => {
    const html = renderLandingPage();
    expect(html).toContain("What early users say");
    expect(html).toContain("Sarah K.");
    expect(html).toContain("Marcus T.");
    expect(html).toContain("Priya R.");
  });

  it("renders the Final CTA section", () => {
    const html = renderLandingPage();
    expect(html).toContain("Ready to build your AI team?");
  });

  it("renders the footer with navigation links", () => {
    const html = renderLandingPage();
    expect(html).toContain("Docs");
    expect(html).toContain("API");
    expect(html).toContain("© 2026 Doer");
  });

  it("renders nav links to Features, How it works, Pricing, and Compare", () => {
    const html = renderLandingPage();
    expect(html).toContain('href="#features"');
    expect(html).toContain('href="#how-it-works"');
    expect(html).toContain('href="#pricing"');
    expect(html).toContain('href="#comparison"');
  });

  it("renders sign-up links pointing to /auth?mode=sign_up", () => {
    const html = renderLandingPage();
    expect(html).toContain('/auth?mode=sign_up');
  });

  it("renders the early access badge", () => {
    const html = renderLandingPage();
    expect(html).toContain("early access");
  });

  it("renders the agent dashboard demo in hero", () => {
    const html = renderLandingPage();
    expect(html).toContain("Research Bot");
    expect(html).toContain("Content Writer");
    expect(html).toContain("Sales Assistant");
    expect(html).toContain("PM Agent");
  });

  it("renders trusted-by logos section", () => {
    const html = renderLandingPage();
    expect(html).toContain("Trusted by teams at");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Globex");
  });

  it("renders star ratings in testimonials", () => {
    const html = renderLandingPage();
    expect(html).toContain("fill-amber-400");
  });
});
