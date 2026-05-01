# Release & Versioning

**Community 26** · 4 concepts · cohesion 0.50

## Concepts

### Calendar Versioning Scheme (YYYY.MDD.P)
*Source: `doc/plans/2026-03-17-release-automation-and-versioning.md`*

**Relationships:**
- implements → **Release Automation and Versioning** `[EXTRACTED]`

### Auto-Publish Canaries from Master
*Source: `doc/plans/2026-03-17-release-automation-and-versioning.md`*

**Relationships:**
- implements → **Release Automation and Versioning** `[EXTRACTED]`

### Release Automation and Versioning
*Source: `doc/plans/2026-03-17-release-automation-and-versioning.md`*

**Relationships:**
- implements → **Calendar Versioning Scheme (YYYY.MDD.P)** `[EXTRACTED]`
- implements → **Auto-Publish Canaries from Master** `[EXTRACTED]`
- implements → **Stable Release Promotion Workflow** `[EXTRACTED]`

### Stable Release Promotion Workflow
*Source: `doc/plans/2026-03-17-release-automation-and-versioning.md`*

**Relationships:**
- implements → **Release Automation and Versioning** `[EXTRACTED]`

## Key Relationships Within Community

- **Calendar Versioning Scheme (YYYY.MDD.P)** → implements → **Release Automation and Versioning**
- **Auto-Publish Canaries from Master** → implements → **Release Automation and Versioning**
- **Release Automation and Versioning** → implements → **Calendar Versioning Scheme (YYYY.MDD.P)**
- **Release Automation and Versioning** → implements → **Auto-Publish Canaries from Master**
- **Release Automation and Versioning** → implements → **Stable Release Promotion Workflow**
- **Stable Release Promotion Workflow** → implements → **Release Automation and Versioning**

---
[← Back to Index](index.md)