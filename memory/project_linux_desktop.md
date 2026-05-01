---
name: Linux Desktop Build Plan
description: Plan for adding Linux (AppImage + deb) to the Doer Electron desktop release pipeline
type: project
---

Adding Linux support to the Electron Forge release pipeline. **No auto-update** — `update-electron-app` doesn't support Linux; ship and tell users to re-download manually.

**Why:** User explicitly wants AppImage + .deb builds for Linux. Auto-update is a future concern.

**How to apply:** When user asks to add Linux builds, follow these steps exactly.

## Steps

### 1. forge.config.ts — add Linux makers

```ts
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerAppImage } from "@electron-forge/maker-appimage";

// In makers array:
new MakerDeb({
  options: {
    maintainer: "Donjon Intelligence Systems",
    homepage: "https://donjon.agency",
  },
}),
new MakerAppImage({}),
```

Install devDeps in `desktop/`:
```sh
pnpm add -D @electron-forge/maker-deb @electron-forge/maker-appimage
```

### 2. desktop-release.yml — add ubuntu matrix entry

```yaml
- os: ubuntu-latest
  platform: linux
  arch: x64
```

For ubuntu runner, also add this step before `pnpm run make`:
```yaml
- name: Install Linux build dependencies
  if: matrix.os == 'ubuntu-latest'
  run: sudo apt-get install -y rpm fakeroot
```

### 3. upload-artifacts.mjs — add Linux glob patterns

The existing upload script globs for `.zip`, `.exe`, `.nupkg`. Extend to include:
- `**/*.deb`
- `**/*.AppImage`

### 4. publish-manifest.mjs — Linux path

Add `linux/x64/` path in the RELEASES.json manifest writer (informational only — no auto-update consumer for Linux yet).

### 5. GitHub Actions artifact upload glob

In the workflow's "Upload artifacts" step, add:
```yaml
desktop/out/make/**/*.deb
desktop/out/make/**/*.AppImage
```

## Known Constraints
- AppImage build requires `fakeroot` on the ubuntu runner.
- MakerDeb requires `rpmbuild` if you want RPM too (not needed here).
- Cross-compiling Linux from macOS is painful; use ubuntu-latest runner.
- embedded-postgres has a linux-x64 optional dep — prebuild.mjs DOER_TARGET_OS/DOER_TARGET_CPU already handles this.
