#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Beings Automation Startup Script
# ─────────────────────────────────────────────────────────────────────────────
# Options:
#   ./beings-start.sh test       — Run pipeline once right now (test mode)
#   ./beings-start.sh n8n        — Start n8n server and import workflow
#   ./beings-start.sh cron       — Install system cron job (8am daily, no n8n needed)
#   ./beings-start.sh queue      — Print the current post queue
# ─────────────────────────────────────────────────────────────────────────────

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE="$DIR/beings-pipeline.js"
WORKFLOW="$DIR/beings-n8n-workflow.json"
QUEUE="$DIR/beings-queue.json"

# ── Load API key ────────────────────────────────────────────────────────────
if [ -z "$ANTHROPIC_API_KEY" ]; then
  if [ -f "$DIR/beings-config.json" ]; then
    export ANTHROPIC_API_KEY=$(node -e "try{process.stdout.write(require('$DIR/beings-config.json').anthropic_api_key||'')}catch(e){}" 2>/dev/null)
  fi
fi

check_key() {
  if [ -z "$ANTHROPIC_API_KEY" ] || [[ "$ANTHROPIC_API_KEY" != sk-ant-* ]]; then
    echo ""
    echo "⚠️  ANTHROPIC_API_KEY not found."
    echo "   Option 1: export ANTHROPIC_API_KEY=sk-ant-..."
    echo "   Option 2: copy beings-config.json.example → beings-config.json and add your key"
    echo ""
    exit 1
  fi
}

# ── Commands ─────────────────────────────────────────────────────────────────

case "${1:-help}" in

  test)
    check_key
    echo "Running Beings pipeline now (test mode)…"
    node "$PIPELINE"
    ;;

  n8n)
    # Start n8n and import the workflow
    N8N=$(which n8n 2>/dev/null || echo "/usr/local/lib/node_modules/n8n/bin/n8n")
    if [ ! -x "$N8N" ]; then
      echo "❌ n8n not found. Install with: sudo npm install -g n8n"
      exit 1
    fi

    echo "Starting n8n server…"
    echo "Once running, open http://localhost:5678"
    echo ""
    echo "To import the Beings workflow:"
    echo "  1. Open http://localhost:5678 in your browser"
    echo "  2. Click 'Add workflow' → 'Import from file'"
    echo "  3. Select: $WORKFLOW"
    echo "  4. Set your ANTHROPIC_API_KEY in n8n Settings → Environment Variables"
    echo "  5. Activate the workflow toggle"
    echo ""
    export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    "$N8N" start
    ;;

  cron)
    # Install a cron job — no n8n needed, just system cron
    check_key
    CRON_CMD="0 8 * * * cd $DIR && ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY node $PIPELINE >> $DIR/beings-pipeline.log 2>&1"

    # Check if already installed
    if crontab -l 2>/dev/null | grep -q "beings-pipeline"; then
      echo "ℹ️  Cron job already exists:"
      crontab -l | grep beings-pipeline
      echo ""
      echo "Remove it? (y/N)"
      read -r answer
      if [[ "$answer" =~ ^[Yy]$ ]]; then
        crontab -l 2>/dev/null | grep -v beings-pipeline | crontab -
        echo "✅ Cron job removed."
      fi
    else
      (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
      echo "✅ Cron job installed — pipeline runs every day at 8:00 AM."
      echo ""
      echo "Verify with: crontab -l"
      echo "View logs:   tail -f $DIR/beings-pipeline.log"
    fi
    ;;

  queue)
    if [ ! -f "$QUEUE" ]; then
      echo "No queue file found at $QUEUE"
      exit 1
    fi
    echo "═══ Beings Post Queue ═══"
    node -e "
const q = require('$QUEUE');
const pending = q.filter(p => p.status === 'pending');
const approved = q.filter(p => p.status === 'approved');
const posted = q.filter(p => p.status === 'posted');
console.log(\`Total: \${q.length} | Pending: \${pending.length} | Approved: \${approved.length} | Posted: \${posted.length}\`);
console.log('');
if (pending.length === 0) { console.log('No pending posts.'); process.exit(0); }
console.log('PENDING POSTS:');
pending.forEach((p, i) => {
  console.log(\`\n[\${i+1}] \${p.generated_at?.slice(0,10) || '?'}\`);
  console.log(\`    \${p.text}\`);
  console.log(\`    (\${p.text.length} chars)\`);
});
"
    ;;

  help|*)
    echo ""
    echo "Beings Automation"
    echo "─────────────────"
    echo "  ./beings-start.sh test   — Run pipeline once now"
    echo "  ./beings-start.sh n8n    — Start n8n server"
    echo "  ./beings-start.sh cron   — Install 8am daily cron job"
    echo "  ./beings-start.sh queue  — View pending post queue"
    echo ""
    ;;
esac
