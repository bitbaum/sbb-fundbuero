#!/usr/bin/env bash
set -euo pipefail

# Model Selection Helper for Cursor IDE
# Usage: ./scripts/model-selector.sh "task description"

TASK="${1:-}"
REPO_ROOT=$(cd "$(dirname "$0")"/.. && pwd)

echo "🤖 AI Model Selection Helper for SBB Fundbüro"
echo "=============================================="

if [[ -z "$TASK" ]]; then
    echo ""
    echo "Usage: $0 \"<task description>\""
    echo ""
    echo "Examples:"
    echo "  $0 \"implement AI matching service\""
    echo "  $0 \"fix database connection issues\""
    echo "  $0 \"create React frontend components\""
    echo "  $0 \"optimize API performance\""
    echo ""
    echo "Available models in Cursor:"
    echo "  • Code-Supernova-1-Million - Advanced reasoning, massive context"
    echo "  • Grok Code - Fast, practical, current knowledge"
    echo "  • Claude Code - Balanced, TypeScript expertise"
    echo "  • Other models - Latest GPT models, etc."
    exit 1
fi

echo ""
echo "📋 Task: $TASK"
echo ""

# Simple keyword-based model selection
TASK_LOWER=$(echo "$TASK" | tr '[:upper:]' '[:lower:]')

if [[ "$TASK_LOWER" =~ (architecture|design|system|complex|strategy|planning) ]]; then
    echo "🏗️  RECOMMENDED: Code-Supernova-1-Million"
    echo "   Why: Massive context window perfect for complex system design"
    echo "   Use when: Planning architecture, multi-step implementations"
elif [[ "$TASK_LOWER" =~ (quick|fix|update|current|latest|research) ]]; then
    echo "⚡ RECOMMENDED: Grok Code"
    echo "   Why: Real-time web access and current best practices"
    echo "   Use when: Need latest info, quick fixes, current trends"
elif [[ "$TASK_LOWER" =~ (typescript|node|api|backend|database|type) ]]; then
    echo "🔧 RECOMMENDED: Claude Code"
    echo "   Why: Strong TypeScript/Node.js expertise and clean patterns"
    echo "   Use when: Backend development, API work, type safety"
elif [[ "$TASK_LOWER" =~ (frontend|react|ui|component|interface) ]]; then
    echo "🎨 RECOMMENDED: Latest GPT model or Claude Code"
    echo "   Why: Strong web development and UI capabilities"
    echo "   Use when: Frontend development, user interfaces"
else
    echo "🤔 RECOMMENDED: Code-Supernova-1-Million (default)"
    echo "   Why: Handles diverse tasks well with large context"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Launch Cursor IDE on this workspace"
echo "2. Select the recommended model"
echo "3. Use 'Apply' to implement changes"
echo "4. Run 'make handoff AGENT=\"<model>\" NEXT=\"$TASK\"' when done"
echo ""
echo "💡 Pro Tip: Models can seamlessly take over from each other!"
echo "   Just ensure TASK_QUEUE.md and AGENTS_SYNC.md are updated."

