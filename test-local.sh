#!/bin/bash

# Readiscover Local Test Script
# Run this to verify your local setup

echo "🧪 Testing Readiscover Local Setup"
echo "===================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Node.js found: $NODE_VERSION"
else
    echo "  ❌ Node.js not found. Please install Node.js v18+"
    exit 1
fi

# Check npm
echo "✓ Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "  npm found: v$NPM_VERSION"
else
    echo "  ❌ npm not found. Please install npm"
    exit 1
fi

# Check if node_modules exists
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  Dependencies installed ✓"
else
    echo "  Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "  Dependencies installed ✓"
    else
        echo "  ❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check file structure
echo "✓ Checking file structure..."
FILES_TO_CHECK=(
    "index.html"
    "styles.css"
    "main.js"
    "worker/src/index.js"
    "worker/src/arxiv-handler.js"
    "worker/src/llm-client.js"
    "worker/src/session-start.js"
    "worker/src/session-answer.js"
    "package.json"
    "wrangler.toml"
)

MISSING_FILES=0
for FILE in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$FILE" ]; then
        echo "  ✓ $FILE"
    else
        echo "  ❌ Missing: $FILE"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo ""
    echo "  ❌ $MISSING_FILES file(s) missing!"
    exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "🚀 Ready to start development!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Open: index.html in your browser"
echo "  3. Test with an arXiv paper!"
echo ""
echo "See QUICKSTART.md for detailed instructions."
