# Plugin Authoring Smoke Example

A Doer plugin

## Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```

## Install Into Doer

```bash
pnpm doerai plugin install ./
```

## Build Options

- `pnpm build` uses esbuild presets from `@doerai/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.
