# Letta Memory API Reference

All requests use:
- Base URL: `$LETTA_BASE_URL` (default: `https://api.letta.com/v1`)
- Auth: `Authorization: Bearer $LETTA_API_KEY`
- Content-Type: `application/json`

## Agent Memory Blocks

### Read all blocks (via agent retrieval)
```
GET /agents/{agent_id}
→ response.memory.blocks: Array<{ id, label, value, limit }>
```

### Update a block value
```
PATCH /blocks/{block_id}
{ "value": "new content string" }
```

## Archival Memory (Long-Term Learnings)

### Write a learning passage
```
POST /agents/{agent_id}/archival
{ "text": "LEARNING [domain] date\n{...json...}" }
```

### Search archival memory
```
GET /agents/{agent_id}/archival?query={text}&limit={n}
→ { results: [{ id, text, score }] }
```

### List recent archival passages
```
GET /agents/{agent_id}/archival?limit=20
```

## Messaging Alfie

### Send a status update to Alfie
```
POST /agents/{alfie_agent_id}/messages
{ "messages": [{ "role": "user", "content": "..." }] }
```

Use `$ALFIE_AGENT_ID` from environment.

## Recall (Conversation History)

### Search conversation history
```
GET /agents/{agent_id}/messages?query={text}&limit={n}
```
