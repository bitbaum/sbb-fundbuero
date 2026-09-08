#!/usr/bin/env bash
set -euo pipefail

# Executive summary for project status
# Usage: scripts/executive.sh

ROOT=$(cd "$(dirname "$0")"/.. && pwd)

echo "Project: SBB Fundbüro — Executive Update"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ) UTC"
echo

# High-level status
echo "== Overview =="
echo "- Monorepo services: reporting (3001), matching (3002), notification (3003)"
echo "- Coordination: AGENTS_SYNC.md (append-only), TASK_QUEUE.md (priorities), claims/locks enabled"
echo

# Services build status (static; assumes tsc compiled previously)
echo "== Services Build Status =="
for svc in reporting matching notification; do
  if [[ -d "$ROOT/services/$svc/dist" ]] || rg -n "@sbb-fundbuero/$svc" "$ROOT/package.json" -S >/dev/null 2>&1; then
    echo "- $svc: build artifacts present or workspace configured"
  else
    echo "- $svc: not built"
  fi
done
echo

# Open priorities from task queue
echo "== Open Priorities (from TASK_QUEUE.md) =="
if [[ -f "$ROOT/TASK_QUEUE.md" ]]; then
  rg -n "^- \[ \]" "$ROOT/TASK_QUEUE.md" | sed 's/^.*- /- /' || true
else
  echo "- (No TASK_QUEUE.md)"
fi
echo

# Recently completed items
echo "== Recently Completed (from TASK_QUEUE.md) =="
if [[ -f "$ROOT/TASK_QUEUE.md" ]]; then
  rg -n "^- \[x\]" "$ROOT/TASK_QUEUE.md" | sed 's/^.*- /- /' | tail -n 5 || true
else
  echo "- (No TASK_QUEUE.md)"
fi
echo

# Recent activity from agents
echo "== Recent Activity (AGENTS_SYNC.md tail) =="
if [[ -f "$ROOT/AGENTS_SYNC.md" ]]; then
  tail -n 30 "$ROOT/AGENTS_SYNC.md"
else
  echo "- (No AGENTS_SYNC.md)"
fi
echo

# Next steps heuristic
echo "== Suggested Next Steps =="
echo "- Validate notification + matching under Docker Compose"
echo "- Assign API Gateway routing + health aggregation (Cursor P1)"
echo "- Add basic integration tests (smoke via Makefile targets)"

