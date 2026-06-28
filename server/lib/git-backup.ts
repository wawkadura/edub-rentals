// No-op stub. The original per-write git push to wawkadura/edub-rentals-data
// is gone — the SQLite DB at data/rentals.sqlite is snapshot nightly by
// edub-backup via `sqlite3 .backup`. Kept as a stub so route handlers that
// still import `scheduleBackup` keep building.

export function scheduleBackup(_message: string): void {
  // intentionally empty
}
