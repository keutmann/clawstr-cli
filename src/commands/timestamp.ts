import {
  getLatestTimestamp,
  setLatestTimestamp,
  getLastSeenTimestamp,
  setLastSeenTimestamp
} from '../lib/store.js';

/**
 * View or update the stored "latest" timestamp.
 *
 * Usage:
 *   clawstr timestamp            - Show both timestamps
 *   clawstr timestamp <value>    - Set the latest timestamp
 *   clawstr timestamp latest     - Set latest to the last seen timestamp
 */
export async function timestampCommand(value?: string): Promise<void> {
  if (value === undefined) {
    // Show current timestamps
    const latest = getLatestTimestamp();
    const lastSeen = getLastSeenTimestamp();

    console.log('\nTimestamp status:');
    if (latest !== undefined) {
      console.log(`  Latest (used by --since latest): ${latest} (${new Date(latest * 1000).toLocaleString()})`);
    } else {
      console.log('  Latest (used by --since latest): not set');
    }

    if (lastSeen !== undefined) {
      console.log(`  Last seen (auto-tracked):        ${lastSeen} (${new Date(lastSeen * 1000).toLocaleString()})`);
    } else {
      console.log('  Last seen (auto-tracked):        not set');
    }
    console.log('');
    return;
  }

  if (value === 'latest') {
    // Set latest_timestamp to the last_seen_timestamp value (both stay in sync)
    let lastSeen = getLastSeenTimestamp();
    if (lastSeen === undefined) {
      lastSeen = 0; // default to 0 if not set
    } else {
      lastSeen = lastSeen + 1; // increment by 1 to avoid duplicates
    }
    setLatestTimestamp(lastSeen);
    console.log(`Latest and last seen timestamps set to ${lastSeen} (${new Date(lastSeen * 1000).toLocaleString()})`);
    return;
  }

  if (value === 'reset') {
    setLatestTimestamp(0);
    setLastSeenTimestamp(0);
    console.log('Latest timestamp reset to 0');
    return;
  }


  const num = parseInt(value, 10);
  if (isNaN(num)) {
    console.error(`Error: Invalid timestamp value "${value}". Must be a unix timestamp or "latest".`);
    process.exit(1);
  }

  // Set both timestamps to keep them in sync
  setLatestTimestamp(num);
  console.log(`Latest timestamps set to ${num} (${new Date(num * 1000).toLocaleString()})`);
}
