# @donjon/letta-bridge

Import your Letta persistent agents into Paperclip.

## What it does

- **Connects** to Letta cloud via API key
- **Lists** all your Letta agents in a browser UI
- **Syncs** agent mappings to Paperclip state
- **Chats** with Letta agents through streaming interface
- **Shows** Letta memory state on Paperclip agent detail tabs

## Capabilities

| Feature | Status |
|---------|--------|
| Agent browser page | ✓ |
| Connection settings | ✓ |
| Dashboard widget | ✓ |
| Memory viewer tab | ✓ |
| Streaming chat | ✓ |
| Hourly auto-sync | ✓ |

## Setup

1. Install plugin into Paperclip
2. Go to Settings → Letta Connection
3. Add your Letta API key (from https://app.letta.com/settings)
4. Test connection
5. Sync agents

## UI Slots

- `/plugins/letta-bridge` — Agent browser
- Dashboard widget — Connection status
- Settings page — Configuration
- Agent detail tab — Memory viewer

## Dev

```bash
pnpm install
pnpm run build
pnpm run typecheck
```
