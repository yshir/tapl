#!/bin/bash

set -uo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly NC='\033[0m' # No Color

# Counters
passed=0

# Test function
test_ok() {
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

test_error() {
    local input="$1"
    if echo "$input" | deno run main.ts >/dev/null 2>&1; then
        printf "${RED}✗ (should error)${NC} %s\n" "$input"
        exit 1
    else
        printf "${GREEN}✓${NC} %s\n" "$input"
        passed=$((passed + 1))
    fi
}


# Boolean literals
test_ok '{ tag: "true" }' "true"
test_ok '{ tag: "false" }' "false"

# Conditionals
test_ok '{ tag: "true" }' "if true then true else false"
test_ok '{ tag: "false" }' "if false then true else false"

# Natural numbers
test_ok '{ tag: "0" }' "0"
test_ok '{ tag: "succ", t1: { tag: "0" } }' "succ 0"
test_ok '{ tag: "succ", t1: { tag: "succ", t1: { tag: "0" } } }' "succ succ 0"

# Predecessor
test_ok '{ tag: "0" }' "pred 0"
test_ok '{ tag: "0" }' "pred succ 0"
test_ok '{ tag: "succ", t1: { tag: "0" } }' "pred succ succ 0"

# IsZero
test_ok '{ tag: "true" }' "iszero 0"
test_ok '{ tag: "false" }' "iszero succ 0"

# Complex expressions
test_ok '{ tag: "succ", t1: { tag: "0" } }' "if iszero 0 then succ 0 else 0"
test_ok '{ tag: "false" }' "if iszero succ 0 then true else false"

# Error cases
test_error "succ true"
test_error "pred false"
test_error "iszero true"
test_error "if 0 then true else false"

echo
echo "All $passed/$passed tests passed!"
