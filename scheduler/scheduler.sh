#!/bin/sh
# Learniee cron scheduler for the Docker host.
# Replaces Vercel Cron: calls the app's /api/cron/* routes on a schedule.
# All times are UTC (same as the old vercel.json). Every route is idempotent.
#
#   resolve-sessions       every 5 min
#   session-reminders      every 5 min
#   payout-reconcile       every 15 min
#   enrollment-auto-lapse  daily 03:00 UTC
#   due-date-reminders     daily 03:30 UTC

set -u

: "${CRON_SECRET:?CRON_SECRET must be set}"
APP_URL="${APP_URL:-http://app:3000}"

log() { printf '%s [scheduler] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

# hit <route-name>  — skips if the previous run of the same route is still going.
hit() {
  name="$1"
  lock="/tmp/cron-lock-$name"

  if ! mkdir "$lock" 2>/dev/null; then
    log "$name: previous run still in progress, skipping"
    return 0
  fi

  code=$(printf 'Authorization: Bearer %s' "$CRON_SECRET" |
    curl -sS -o /dev/null -w '%{http_code}' --max-time 120 -H @- \
      "$APP_URL/api/cron/$name" 2>/dev/null) || code="000"

  case "$code" in
    2??) log "$name -> $code" ;;
    *) log "$name -> FAILED ($code)" ;;
  esac

  rmdir "$lock" 2>/dev/null || true
}

log "started; target $APP_URL"

while true; do
  # Sleep to the start of the next UTC minute.
  now=$(date -u +%s)
  sleep $((60 - now % 60))

  # Minutes since the UTC epoch. e % 1440 = minute of the UTC day.
  e=$(($(date -u +%s) / 60))

  if [ $((e % 5)) -eq 0 ]; then
    hit resolve-sessions &
    hit session-reminders &
  fi

  if [ $((e % 15)) -eq 0 ]; then
    hit payout-reconcile &
  fi

  if [ $((e % 1440)) -eq 180 ]; then
    hit enrollment-auto-lapse &
  fi

  if [ $((e % 1440)) -eq 210 ]; then
    hit due-date-reminders &
  fi
done
