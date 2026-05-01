# Plugin SDK & Examples

**Community 5** · 18 concepts · cohesion 0.16

## Concepts

### Hello World Example Plugin
*Source: `packages/plugins/examples/plugin-hello-world-example/README.md`*

**Relationships:**
- ? → **Hello World Minimal Plugin** `[1.0]`

### Plugin SDK README
*Source: `packages/plugins/sdk/README.md`*

**Relationships:**
- ? → **Plugin Worker** `[1.0]`
- ? → **Plugin UI Layer** `[1.0]`
- ? → **Plugin Manifest** `[1.0]`
- ? → **UI Slot Types** `[1.0]`
- ? → **Plugin Context API** `[1.0]`

### Hello World Minimal Plugin

**Relationships:**
- ? → **Hello World Example Plugin** `[1.0]`
- ? → **UI Slot Types** `[1.0]`
- ? → **Plugin Manifest** `[1.0]`

### Agent Sessions (Two-way Chat)

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin Context API** `[1.0]`

### Plugin Bundler Presets

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`

### Plugin Capabilities

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin Manifest** `[1.0]`

### Plugin Context API

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin Event System** `[1.0]`
- ? → **Plugin Job Scheduling** `[1.0]`
- ? → **Plugin Streaming (SSE)** `[1.0]`
- ? → **Agent Sessions (Two-way Chat)** `[1.0]`

### Plugin Event System

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin Context API** `[1.0]`

### Plugin Lifecycle Hooks

**Relationships:**
- ? → **Plugin Worker** `[1.0]`

### Plugin Job Scheduling

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin Context API** `[1.0]`

### Plugin Launcher

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **UI Slot Types** `[0.9]`
- ? → **Plugin Manifest** `[1.0]`

### Plugin Manifest

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Hello World Minimal Plugin** `[1.0]`
- ? → **Plugin Capabilities** `[1.0]`
- ? → **Plugin Launcher** `[1.0]`

### Plugin UI Layer

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin UI No Shared Component Kit** `[1.0]`

### Plugin Worker

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin Lifecycle Hooks** `[1.0]`

### Plugin Streaming (SSE)

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Plugin Context API** `[1.0]`

### Plugin Testing Utilities

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`

### Plugin UI No Shared Component Kit

**Relationships:**
- ? → **Plugin UI Layer** `[1.0]`

### UI Slot Types

**Relationships:**
- ? → **Plugin SDK README** `[1.0]`
- ? → **Hello World Minimal Plugin** `[1.0]`
- ? → **Plugin Launcher** `[0.9]`

## Key Relationships Within Community

- **Hello World Example Plugin** → ? → **Hello World Minimal Plugin**
- **Plugin SDK README** → ? → **Plugin Worker**
- **Plugin SDK README** → ? → **Plugin UI Layer**
- **Plugin SDK README** → ? → **Plugin Manifest**
- **Plugin SDK README** → ? → **UI Slot Types**
- **Plugin SDK README** → ? → **Plugin Context API**
- **Plugin SDK README** → ? → **Plugin Capabilities**
- **Plugin SDK README** → ? → **Plugin Event System**
- **Plugin SDK README** → ? → **Plugin Job Scheduling**
- **Plugin SDK README** → ? → **Plugin Launcher**

---
[← Back to Index](index.md)