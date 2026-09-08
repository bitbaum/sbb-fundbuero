SHELL := /bin/bash

.PHONY: help install build dev up down test lint typecheck clean agent-log claim smoke jwt handoff refresh-claim ho smoke-notification smoke-matching smoke-gateway smoke-all model-select executive e dev-gateway

help:
	@echo "Targets: install build dev up down test lint typecheck clean agent-log claim smoke smoke-notification smoke-matching jwt handoff refresh-claim ho model-select executive e dev-gateway"

install:
	@npm install

build:
	@npm run build

dev:
	@npm run dev

up:
	@npm run docker:up

down:
	@npm run docker:down

test:
	@npm test

lint:
	@npm run lint || true

typecheck:
	@npm run typecheck

clean:
	@npm run clean || true

# Append an entry to AGENTS_SYNC.md
# Usage: make agent-log SUMMARY="..." CHANGES="..." COMMANDS="..." NOTES="..." AGENT=Codex
agent-log:
	@AGENT_NAME="$(AGENT)" ./scripts/agent-log.sh "$(SUMMARY)" -c "$(CHANGES)" -k "$(COMMANDS)" -n "$(NOTES)"

claim:
	@AGENT_NAME="$(AGENT)" ETA="$(ETA)" ./scripts/claim.sh "$(AREA)" "$(SUMMARY)"

smoke:
	@./scripts/smoke.sh $(BASE_URL)

smoke-notification:
	@./scripts/smoke-notification.sh $(BASE_URL)

smoke-matching:
	@./scripts/smoke-matching.sh $(BASE_URL)

smoke-gateway:
	@./scripts/smoke-gateway.sh $(BASE_URL)

smoke-all:
	@./scripts/smoke-all.sh $(REPORTING_URL) $(MATCHING_URL) $(NOTIFICATION_URL)

jwt:
	@JWT_SECRET="$(JWT_SECRET)" node ./scripts/generate-jwt.js '$(PAYLOAD)' $(EXPIRES)

handoff:
	@AGENT_NAME="$(AGENT)" NEXT="$(NEXT)" ./scripts/handoff.sh $(BASE_URL)

refresh-claim:
	@AGENT_NAME="$(AGENT)" ETA="$(ETA)" ./scripts/refresh-claim.sh "$(AREA)"

ho:
	@./scripts/ho.sh "$(MESSAGE)" $(BASE_URL)

# Run API Gateway in dev mode on a custom port
# Usage: make dev-gateway PORT=3010 RURL=http://localhost:3001 MURL=http://localhost:3002 NURL=http://localhost:3003
dev-gateway:
	@PORT="$(PORT)" REPORTING_SERVICE_URL="$(RURL)" MATCHING_SERVICE_URL="$(MURL)" NOTIFICATION_SERVICE_URL="$(NURL)" npm run dev --workspace=@sbb-fundbuero/api-gateway

executive:
	@./scripts/executive.sh

e:
	@./scripts/executive.sh

model-select:
	@./scripts/model-selector.sh "$(TASK)"
