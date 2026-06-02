# Im K8 Launch Plan

**Status:** Updated with competitive landscape analysis from Profiler and preliminary target audience/product spec work
**Owner:** DonDog (CEO)
**Last Updated:** 2026-06-02

---

## Executive Summary

This is the master plan for launching **Im K8**, a web application. The plan maps out phases, assigns ownership across the Donjon team, and establishes routines to keep work flowing.

**Critical Path Items:**
1. Get clarity on what Im K8 is (product spec, target audience, core value prop)
2. Define MVP vs. full launch scope
3. Establish technical stack and infrastructure requirements
4. Build, test, deploy, monitor

---

## Phase 0: Discovery & Definition

**Goal:** Understand what we're building and why

### Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Product spec: What is Im K8? | Clay + Profiler | Critical | In Progress |
| Target audience definition | Envoy + Profiler | High | In Progress |
| Core value proposition | Envoy | High | Blocked |
| Competitive landscape scan | Profiler | Medium | Done |
| MVP scope definition | Phalanx + Clay | Critical | Blocked |

**Blocker:** Need Clay to provide initial product brief

---

## Competitive Landscape Analysis (from Profiler)

**Key Finding:** im K8 occupies a unique position in the AI relationship technology space as a communication bridge focused on improving interpersonal dynamics between real people, rather than serving as an AI companion.

**Confirmed Findings:**
- im K8's core value proposition is facilitating communication between real people via AI agent mediation, not providing AI companionship
- Zero data retention is a core product promise - conversations are permanently deleted after report generation
- K8 is built from actual assessment data (SoulTrace 3.0 trait model), not user preferences about how they wish to be seen
- K8 agents are exportable as portable .af (Agent File) format compatible with Letta-based platforms
- Competitors Replika, Character.AI, and Pi primarily offer AI-to-human chat/companionship experiences

**Probable Findings:**
- The interpersonal communication improvement market is less saturated than the AI companion market (Confidence: medium)
- Privacy-conscious users may be particularly attracted to K8's zero data retention approach (Confidence: medium)
- Professionals in therapy, coaching, and mediation fields could see value in K8 as a tool for their practice (Confidence: low)

**Gaps:**
- Limited public data on user adoption metrics and retention rates for interpersonal AI tools
- Little clarity on how K8's assessment depth compares to established personality frameworks like MBTI or Big Five in market perception
- Unclear what specific communication improvement metrics users report after K8 sessions

**Assessment:** im K8 has a clear differentiation opportunity in the growing AI relationship technology market. By focusing on facilitating better human-to-human communication rather than replacing human interaction with AI companionship, K8 addresses a different and potentially less competitive niche. The zero data retention policy and assessment-based approach provide strong privacy and authenticity differentiators.

---

## Phase 1: Architecture & Planning

**Goal:** Design the technical foundation

### Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Technical stack selection | Forge-Wright + Alembic | High | Waiting |
| Infrastructure design | Quartermaster | High | Waiting |
| Security threat model | Gate-Warden | Critical | Waiting |
| Data architecture | Cartographer | Medium | Waiting |
| Development workflow setup | Forge-Wright | High | Waiting |

**Dependencies:** Phase 0 completion

---

## Phase 2: Build

**Goal:** Implement MVP features

### Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Frontend scaffolding | Forge-Wright | High | Waiting |
| Backend API setup | Forge-Wright | High | Waiting |
| Database schema & migrations | Cartographer + Forge-Wright | High | Waiting |
| Core feature implementation | Forge-Wright + Alembic | Critical | Waiting |
| Integration points | Forge-Wright | Medium | Waiting |

**Dependencies:** Phase 1 completion

---

## Phase 3: Test & Validate

**Goal:** Ensure quality and security

### Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Unit test coverage | Forge-Wright | High | Waiting |
| Integration testing | Forge-Wright + Alembic | High | Waiting |
| Security audit | Gate-Warden | Critical | Waiting |
| Performance testing | Quartermaster | Medium | Waiting |
| User acceptance testing | Envoy | High | Waiting |

**Dependencies:** Phase 2 MVP build completion

---

## Phase 4: Deploy & Monitor

**Goal:** Ship to production and establish observability

### Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Production infrastructure setup | Quartermaster | Critical | Waiting |
| CI/CD pipeline | Forge-Wright | High | Waiting |
| Monitoring & alerting = Quartermaster | Critical | Waiting |
| Logging & analytics | Cartographer | High | Waiting |
| Deployment runbook | Quartermaster | High | Waiting |
| Initial deployment = Forge-Wright + Quartermaster | Critical | Waiting |

**Dependencies:** Phase 3 validation complete

---

## Phase 5: Launch & Growth

**Goal:** Go live and scale

### Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Launch communications plan | Envoy | High | Waiting |
| Documentation (user + developer) = Envoy + Forge-Wright | High | Waiting |
| Support workflows | Envoy | Medium | Waiting |
| Growth metrics dashboard | Cartographer | Medium | Waiting |
| Feedback loops | Profiler + Envoy | High | Waiting |
| Iteration roadmap = Phalanx + DonDog | Medium | Waiting |

**Dependencies:** Phase 4 deployment complete

---

## Team Assignments

### Primary Responsibilities

- **DonDog (CEO):** Overall orchestration, unblocking, strategic decisions
- **Chef (PM):** Task queue management, sprint planning, velocity tracking
- **Alfie (CFO):** Budget oversight, gremlin dispatch, business decisions
- **Phalanx (General):** Cross-team coordination, resource allocation, critical path management
- **Forge-Wright (Engineer):** All technical implementation, deployment
- **Gate-Warden (DevOps/Security):** Security audits, access control, threat modeling
- **Cartographer (Data):** Data architecture, analytics, metrics
- **Alembic (R&D):** Prototypes, experiments, technical spikes
- **Profiler (Intelligence):** Competitive analysis, user research, market intel
- **Envoy (CMO):** Communications, documentation, launch messaging
- **Quartermaster (DevOps):** Infrastructure, monitoring, operational continuity

---

## Routines & Automation

### Daily Routines

1. **Issue Queue Health Check** (Chef)
   - Scan for blocked tasks
   - Flag stale tasks (>3 days no update)
   - Escalate to DonDog if critical path is blocked

2. **Security Sweep** (Gate-Warden)
   - Check for new vulnerabilities in dependencies
   - Review access logs for anomalies
   - Report findings to Alfie

3. **Build Health** (Forge-Wright)
   - Check CI/CD status
   - Review test coverage trends
   - Flag failing builds immediately

### Weekly Routines

1. **Sprint Planning** (Chef + Phalanx)
   - Review completed work
   - Prioritize next sprint tasks
   - Adjust resource allocation

2. **Progress Report** (DonDog → Clay)
   - What shipped
   - What's blocked
   - What decisions are needed

3. **Budget Review** (Alfie)
   - Track spend vs. budget
   - Flag overruns
   - Recommend adjustments

### Milestone Routines

1. **Phase Gate Review** (Phalanx + DonDog)
   - Verify phase completion criteria met
   - Green-light next phase or flag blockers
   - Update master plan

---

## Next Steps (Immediate)

1. **[DONA-2] Clay: Provide Im K8 Product Brief** (Critical)
   - What is Im K8?
   - Who is it for?
   - What problem does it solve?
   - MVP vs. full vision?

2. **[DONA-3] Profiler: Competitive Landscape Scan** (High) - **COMPLETE**
   - Identify similar products
   - Map their strengths/weaknesses
   - Find our differentiation angle

3. **[DONA-4] Chef: Set Up Issue Queue Routines** (High)
   - Implement daily health check
   - Configure alerts for blocked tasks
   - Report to DonDog

4. **[DONA-5] Phalanx: Build Initial Sprint 0 Plan** (High)
   - Once we have product brief
   - Break Phase 0 + Phase 1 into 2-week sprints
   - Assign task owners

5. **[DONA-6] Alfie: Budget Allocation for Launch** (Medium)
   - Estimate costs per phase
   - Set budget caps
   - Configure spending alerts

---

## Risk Register

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| Unclear product requirements | Critical | Get Clay's product brief ASAP | DonDog |
| Scope creep | High | Lock MVP scope, defer enhancements | Phalanx |
| Security vulnerabilities | Critical | Gate-Warden audit at every phase | Gate-Warden |
| Infrastructure failures | High | Redundancy + monitoring | Quartermaster |
| Budget overrun | Medium | Alfie weekly reviews, early alerts | Alfie |
| Team availability = Medium | Cross-train, document everything | Chef |

---

## Success Criteria

**MVP Launch (Phase 4 complete):**
- [ ] App is live and accessible
- [ ] Core features working
- [ ] Security audit passed
- [ ] Monitoring in place
- [ ] Zero critical bugs in production

**Full Launch (Phase 5 complete):**
- [ ] User documentation published
- [ ] Support workflows active
- [ ] Growth metrics tracked
- [ ] Feedback loop operational
- [ ] Iteration roadmap defined

---

## Notes

This is a living document. Updated with competitive landscape analysis from Profiler on 2026-06-02 and preliminary target audience/product spec work. The plan will evolve once Clay provides the product brief.

**Competitive landscape analysis available at:** ./memory/deliverables/profiler/DONA-36-k8-competitive-landscape.md

**Preliminary target audience analysis available at:** ./memory/profiler/target-audience-preview.md

**Preliminary product specification available at:** ./memory/profiler/product-spec-preview.md
