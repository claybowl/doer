# Deployment Modes

**Community 12** · 9 concepts · cohesion 0.22

## Concepts

### Authenticated Deployment Mode
*Source: `doc/plans/2026-02-23-deployment-auth-mode-consolidation.md`*

**Relationships:**
- implements → **Deployment/Auth Mode Consolidation** `[EXTRACTED]`
- implements → **Private Network Exposure Policy** `[EXTRACTED]`
- implements → **Public Exposure Policy** `[EXTRACTED]`
- references → **Deployment Overview** `[EXTRACTED]`
- implements → **Deployment Modes** `[EXTRACTED]`

### Authenticated Mode
*Source: `doc/DEPLOYMENT-MODES.md`*

**Relationships:**
- conceptually_related_to → **Deployment Modes** `[EXTRACTED]`

### Deployment/Auth Mode Consolidation
*Source: `doc/plans/2026-02-23-deployment-auth-mode-consolidation.md`*

**Relationships:**
- implements → **Authenticated Deployment Mode** `[EXTRACTED]`

### Deployment Modes
*Source: `doc/DEPLOYMENT-MODES.md`*

**Relationships:**
- conceptually_related_to → **Local Trusted Mode** `[EXTRACTED]`
- conceptually_related_to → **Authenticated Mode** `[EXTRACTED]`
- rationale_for → **Doer Control Plane** `[EXTRACTED]`
- implements → **Authenticated Deployment Mode** `[EXTRACTED]`

### Deployment Overview
*Source: `docs/deploy/overview.md`*

**Relationships:**
- references → **Authenticated Deployment Mode** `[EXTRACTED]`

### Local Trusted Mode
*Source: `doc/DEPLOYMENT-MODES.md`*

**Relationships:**
- conceptually_related_to → **Deployment Modes** `[EXTRACTED]`

### Private Network Exposure Policy
*Source: `doc/plans/2026-02-23-deployment-auth-mode-consolidation.md`*

**Relationships:**
- implements → **Authenticated Deployment Mode** `[EXTRACTED]`

### Public Exposure Policy
*Source: `doc/plans/2026-02-23-deployment-auth-mode-consolidation.md`*

**Relationships:**
- implements → **Authenticated Deployment Mode** `[EXTRACTED]`

### Tailscale Private Access Configuration
*Source: `docs/deploy/tailscale-private-access.md`*

**Relationships:**
- references → **Authenticated Deployment Mode** `[EXTRACTED]`

## Key Relationships Within Community

- **Authenticated Deployment Mode** → implements → **Deployment/Auth Mode Consolidation**
- **Authenticated Deployment Mode** → implements → **Private Network Exposure Policy**
- **Authenticated Deployment Mode** → implements → **Public Exposure Policy**
- **Authenticated Deployment Mode** → references → **Deployment Overview**
- **Authenticated Deployment Mode** → implements → **Deployment Modes**
- **Authenticated Deployment Mode** → references → **Tailscale Private Access Configuration**
- **Authenticated Mode** → conceptually_related_to → **Deployment Modes**
- **Deployment/Auth Mode Consolidation** → implements → **Authenticated Deployment Mode**
- **Deployment Modes** → conceptually_related_to → **Local Trusted Mode**
- **Deployment Modes** → conceptually_related_to → **Authenticated Mode**

---
[← Back to Index](index.md)