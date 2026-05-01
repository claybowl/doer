# Human Auth & Onboarding

**Community 16** · 7 concepts · cohesion 0.29

## Concepts

### Auto-Detection of Runtime Environments
*Source: `doc/plans/2026-03-13-features.md`*

**Relationships:**
- implements → **Guided Onboarding (Interview-First)** `[EXTRACTED]`

### Better Auth for Human Authentication
*Source: `doc/plans/2026-02-21-humans-and-permissions.md`*

**Relationships:**
- implements → **Deployment Mode: Cloud Hosted** `[EXTRACTED]`

### Deployment Mode: Cloud Hosted
*Source: `doc/plans/2026-02-21-humans-and-permissions.md`*

**Relationships:**
- implements → **Humans and Permissions Model** `[EXTRACTED]`
- implements → **Better Auth for Human Authentication** `[EXTRACTED]`

### Deployment Mode: Local Trusted
*Source: `doc/plans/2026-02-21-humans-and-permissions.md`*

**Relationships:**
- implements → **Humans and Permissions Model** `[EXTRACTED]`
- semantically_similar_to → **Guided Onboarding (Interview-First)** `[INFERRED]`

### Guided Onboarding (Interview-First)
*Source: `doc/plans/2026-03-13-features.md`*

**Relationships:**
- uses → **Onboarding Profile Type** `[EXTRACTED]`
- implements → **Auto-Detection of Runtime Environments** `[EXTRACTED]`
- semantically_similar_to → **Deployment Mode: Local Trusted** `[INFERRED]`

### Humans and Permissions Model
*Source: `doc/plans/2026-02-21-humans-and-permissions.md`*

**Relationships:**
- implements → **Deployment Mode: Local Trusted** `[EXTRACTED]`
- implements → **Deployment Mode: Cloud Hosted** `[EXTRACTED]`

### Onboarding Profile Type
*Source: `doc/plans/2026-03-13-features.md`*

**Relationships:**
- uses → **Guided Onboarding (Interview-First)** `[EXTRACTED]`

## Key Relationships Within Community

- **Auto-Detection of Runtime Environments** → implements → **Guided Onboarding (Interview-First)**
- **Better Auth for Human Authentication** → implements → **Deployment Mode: Cloud Hosted**
- **Deployment Mode: Cloud Hosted** → implements → **Humans and Permissions Model**
- **Deployment Mode: Cloud Hosted** → implements → **Better Auth for Human Authentication**
- **Deployment Mode: Local Trusted** → implements → **Humans and Permissions Model**
- **Deployment Mode: Local Trusted** → semantically_similar_to → **Guided Onboarding (Interview-First)**
- **Guided Onboarding (Interview-First)** → uses → **Onboarding Profile Type**
- **Guided Onboarding (Interview-First)** → implements → **Auto-Detection of Runtime Environments**
- **Guided Onboarding (Interview-First)** → semantically_similar_to → **Deployment Mode: Local Trusted**
- **Humans and Permissions Model** → implements → **Deployment Mode: Local Trusted**

---
[← Back to Index](index.md)