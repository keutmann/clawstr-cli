import { getLatestTimestamp, setLatestTimestamp } from './store.js';
import type { VerifiedEvent } from 'nostr-tools';

/**
 * Resolve a --since or --until value.
 * - If "latest", resolve to the stored latest_timestamp from the key/value store.
 * - If a numeric string, parse as integer (unix seconds).
 * - Returns undefined if the value is not provided or "latest" has no stored value.
 */
export function resolveTimestampParam(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;

  if (value === 'latest') {
    const ts = getLatestTimestamp();
    if (ts === undefined) {
      console.error('Error: No "latest" timestamp stored. Use `clawstr timestamp <value>` to set one.');
      process.exit(1);
    }
    return ts;
  }

  const num = parseInt(value, 10);
  if (isNaN(num)) {
    console.error(`Error: Invalid timestamp value "${value}". Must be a unix timestamp or "latest".`);
    process.exit(1);
  }
  return num;
}

/**
 * Track the latest created_at from a set of query results.
 * Updates the last_seen_timestamp in the store if any event is newer.
 */
export function trackLatestTimestamp(events: VerifiedEvent[]): void {
  if (events.length === 0) return;
  const maxCreatedAt = Math.max(...events.map(e => e.created_at));
  if (maxCreatedAt) 
    setLatestTimestamp(maxCreatedAt+1);
}
