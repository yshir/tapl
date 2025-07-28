#!/bin/bash

set -uo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly NC='\033[0m' # No Color

# Counters
passed=0

# Test function
test() {
    local expected="$1"
    local input="$2"

    local actual
    actual=$(echo "$input" | deno run main.ts 2>/dev/null | tail -1)

    if [[ "$actual" == "$expected" ]]; then
        printf "${GREEN}✓${NC} %s\n" "$input"
        passed=$((passed + 1))
    else
        printf "${RED}✗${NC} %s\n" "$input"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        exit 1
    fi
}

# Boolean literals
test '{ tag: "true" }' "true"
test '{ tag: "false" }' "false"

# Conditionals
test '{ tag: "true" }' "if true then true else false"
test '{ tag: "false" }' "if false then true else false"

# Natural numbers
test '{ tag: "zero" }' "0"
test '{ tag: "succ", value: { tag: "zero" } }' "succ 0"
test '{ tag: "succ", value: { tag: "succ", value: { tag: "zero" } } }' "succ succ 0"

# Predecessor
test '{ tag: "zero" }' "pred 0"
test '{ tag: "zero" }' "pred succ 0"
test '{ tag: "succ", value: { tag: "zero" } }' "pred succ succ 0"

# IsZero
test '{ tag: "true" }' "iszero 0"
test '{ tag: "false" }' "iszero succ 0"

# Complex expressions
test '{ tag: "succ", value: { tag: "zero" } }' "if iszero 0 then succ 0 else 0"
test '{ tag: "false" }' "if iszero succ 0 then true else false"

echo
echo "All $passed/$passed tests passed!"
