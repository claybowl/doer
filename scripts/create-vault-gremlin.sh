#!/usr/bin/env bash
# create-vault-gremlin.sh
# Creates Vault as a Paperclip agent with opencode_local adapter + Letta memory wiring.
# Run from the paperclip/ directory with Paperclip running at localhost:3100.
#
# Usage:
#   cd donjon-paperclip/paperclip
#   ../scripts/create-vault-gremlin.sh

set -euo pipefail

PAPERCLIP_URL="${PAPERCLIP_URL:-http://localhost:3100}"

# ── 1. Get company ID ──────────────────────────────────────────────────────────
echo "→ Fetching company list..."
COMPANIES=$(curl -sf "$PAPERCLIP_URL/api/companies")
COMPANY_ID=$(echo "$COMPANIES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
companies = data.get('companies', data) if isinstance(data, dict) else data
if not companies:
    print('ERROR: no companies found', file=sys.stderr)
    sys.exit(1)
print(companies[0]['id'])
")
COMPANY_NAME=$(echo "$COMPANIES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
companies = data.get('companies', data) if isinstance(data, dict) else data
print(companies[0]['name'])
")
echo "   Company: $COMPANY_NAME ($COMPANY_ID)"

# ── 2. Build adapter config ────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_MD_PATH="$REPO_ROOT/agents/vault/AGENTS.md"
LETTA_API_KEY="${LETTA_API_KEY:-}"
LETTA_BASE_URL="${LETTA_BASE_URL:-https://api.letta.com/v1}"
VAULT_LETTA_ID="agent-0890c7bd-a20e-4c44-9719-0dbc59d835b7"
ALFIE_LETTA_ID="agent-95b86955-10c3-4949-99c9-3c4879d6a95e"

if [[ -z "$LETTA_API_KEY" ]]; then
  # Try to read from .env.local
  ENV_FILE="$REPO_ROOT/paperclip/.env.local"
  if [[ -f "$ENV_FILE" ]]; then
    LETTA_API_KEY=$(grep "^LETTA_API_KEY=" "$ENV_FILE" | cut -d= -f2- | tr -d '"')
    echo "   Loaded LETTA_API_KEY from $ENV_FILE"
  else
    echo "⚠️  LETTA_API_KEY not set. Set it as env var or in paperclip/.env.local"
    echo "   Continuing — you can update adapter config in the Paperclip board later."
  fi
fi

echo "→ Creating Vault agent..."
PAYLOAD=$(python3 -c "
import json
payload = {
  'name': 'Vault',
  'role': 'engineer',
  'adapterType': 'opencode_local',
  'adapterConfig': {
    'command': 'opencode',
    'instructionsFilePath': '$AGENTS_MD_PATH',
    'model': 'google/antigravity-claude-sonnet-4-6',
    'skills': ['paperclip', 'letta-memory', 'gremlin'],
    'env': {
      'LETTA_API_KEY':    '$LETTA_API_KEY',
      'LETTA_BASE_URL':   '$LETTA_BASE_URL',
      'LETTA_AGENT_ID':   '$VAULT_LETTA_ID',
      'ALFIE_AGENT_ID':   '$ALFIE_LETTA_ID',
    },
    'promptTemplate': (
      'You are Vault, Super-Gremlin specialist in secrets and sensitive data handling. '
      'Agent ID: {{agent.id}} | Run ID: {{run.id}}. '
      'Follow your AGENTS.md instructions and the injected skills. '
      'Load your Letta memory first, check your Paperclip inbox, do excellent work.'
    ),
    'timeoutSec': 300,
  },
  'heartbeatPolicy': {
    'enabled': True,
    'intervalSec': 120
  }
}
print(json.dumps(payload))
")

echo "   Payload built. Sending to Paperclip..."
HTTP_STATUS=$(curl -s -o /tmp/vault_create_response.json -w "%{http_code}" \
  -X POST "$PAPERCLIP_URL/api/companies/$COMPANY_ID/agents" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "   HTTP status: $HTTP_STATUS"
echo "   Response:"
cat /tmp/vault_create_response.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))" 2>/dev/null || cat /tmp/vault_create_response.json
echo ""

if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "201" ]]; then
  echo "❌ Agent creation failed (HTTP $HTTP_STATUS). See response above."
  exit 1
fi

VAULT_PAPERCLIP_ID=$(cat /tmp/vault_create_response.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
agent = data.get('agent', data)
print(agent.get('id', 'ERROR: no id in response'))
")

echo ""
echo "✅ Vault created in Paperclip!"
echo "   Paperclip Agent ID: $VAULT_PAPERCLIP_ID"
echo "   Letta Agent ID:     $VAULT_LETTA_ID"
echo ""
echo "── Next steps ──────────────────────────────────────────────────"
echo "1. Add VAULT_PAPERCLIP_ID to Alfie's env vars in the Paperclip board:"
echo "   PAPERCLIP_AGENT_VAULT=$VAULT_PAPERCLIP_ID"
echo ""
echo "2. Add PAPERCLIP_API_URL + PAPERCLIP_COMPANY_ID to Alfie's env:"
echo "   PAPERCLIP_API_URL=http://localhost:3100"
echo "   PAPERCLIP_COMPANY_ID=$COMPANY_ID"
echo ""
echo "3. Test a heartbeat:"
echo "   npx paperclipai heartbeat run --agent-id $VAULT_PAPERCLIP_ID"
echo ""
echo "4. Or dispatch a test task from Alfie:"
echo "   dispatch_gremlin('Vault', 'TEST-01', 'Confirm your Letta memory is loading. Read your persona block and archival memory. Report what you find.')"
echo "────────────────────────────────────────────────────────────────"
