#!/usr/bin/env bash
# Tenant SSOT guard.
#
# The app is white-label: an operator's identity is expressed in exactly two
# places — lib/tenant.ts (strings) and the :root[data-tenant=...]
# blocks in app/globals.css (colours/fonts). Everything else must be
# operator-agnostic.
#
# This exists because the codebase was originally written for one operator and
# the name was spread across 600+ references. Re-introducing one hardcoded name
# silently un-does the white-labelling — nothing would fail, the app would just
# quietly stop being re-brandable. So the rule is enforced, not documented.
set -euo pipefail

cd "$(dirname "$0")/.."

# Operator names that must never appear outside the SSOT files.
PATTERN='SBB|Schweizerische Bundesbahnen|NORDBAHN|Nordbahn'

# The two files allowed to name an operator, plus data files holding real
# proper nouns (station names such as "Basel SBB" are place names, not
# branding, and renaming them would make the demo data wrong).
ALLOWED='lib/tenant.ts|app/globals.css|lib/mock-data.ts'

echo "tenant SSOT: checking the app for hardcoded operator names…"

hits=$(grep -rnE "$PATTERN" app components lib \
         --include='*.ts' --include='*.tsx' --include='*.css' \
       | grep -vE "^($ALLOWED)" || true)

if [ -n "$hits" ]; then
  echo "" >&2
  echo "✗ operator name hardcoded outside the tenant SSOT:" >&2
  echo "$hits" >&2
  echo "" >&2
  echo "Move the string to lib/tenant.ts and read it from there," >&2
  echo "or the app stops being re-brandable in one command." >&2
  exit 1
fi

# The neutral tenant must stay the default: an unset/typo'd NEXT_PUBLIC_TENANT
# must never fall back to a build carrying someone else's trademark.
if ! grep -q "DEFAULT_TENANT_ID: TenantId = 'nordbahn'" lib/tenant.ts; then
  echo "✗ default tenant is no longer the neutral house brand" >&2
  exit 1
fi

echo "tenant SSOT: ok (no operator names outside tenant.ts / globals.css)"
