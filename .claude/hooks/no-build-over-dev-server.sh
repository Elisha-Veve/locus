#!/usr/bin/env bash
# PreToolUse guard for Bash.
#
# `next build` writes over .next. Doing that while `next dev` serves from the
# same directory leaves the running server with half a build, and every route
# then 500s with "Cannot find module './<chunk>.js'" until it is restarted and
# .next is cleared. Deleting .next outright does the same. Nothing in that
# message points at its cause, so it is worth blocking rather than remembering.
#
# Two things this gets wrong if written naively, both found by using it:
#
#   Matching too widely. A first version looked for the text anywhere in the
#   command and refused a `git commit` whose message merely mentioned the
#   build. Heredoc bodies are dropped first, and a match only counts at a
#   command position: start of line, or after ; && || | or (.
#
#   Detecting the server too widely. `lsof -ti tcp:PORT` reports any socket on
#   that port, including a client connection left behind after the server has
#   gone, which kept the guard armed with nothing running. -sTCP:LISTEN asks
#   the question actually meant.
#
# Reads the tool call on stdin. Prints a deny decision only when a dev server
# is genuinely listening; silent otherwise.
set -uo pipefail

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

# Drop heredoc bodies, so documentation and commit messages are not scanned.
stripped=$(printf '%s\n' "$cmd" | awk '
  !inhd && match($0, /<<-?['"'"'"]?[A-Za-z_][A-Za-z0-9_]*['"'"'"]?/) {
    m = substr($0, RSTART, RLENGTH)
    sub(/^<<-?['"'"'"]?/, "", m); sub(/['"'"'"]$/, "", m)
    marker = m; inhd = 1; print; next
  }
  inhd { if ($0 == marker || $0 == "\t" marker) inhd = 0; next }
  { print }
')

# Only at a command position, so a mention inside an argument does not count.
if ! printf '%s' "$stripped" | grep -qE \
  '(^|[;&|(]|&&|\|\|)[[:space:]]*(npm[[:space:]]+run[[:space:]]+build|(npx[[:space:]]+)?next[[:space:]]+build|rm[[:space:]]+-[rf]+[[:space:]]+\.?/?\.next)'
then
  exit 0
fi

# Ports come from .claude/launch.json: locus and locus-demo.
for port in 3210 3211; do
  if lsof -ti "tcp:$port" -sTCP:LISTEN >/dev/null 2>&1; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"A dev server is listening on %s. Building or clearing .next underneath it leaves the running server serving a half-written build, and every route 500s with \\"Cannot find module\\". Stop the dev server first (preview_stop, or the process on port %s), then build."}}' "$port" "$port"
    exit 0
  fi
done
exit 0
