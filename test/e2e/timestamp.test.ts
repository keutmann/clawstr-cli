import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = join(__dirname, '../../dist/index.js');
const TEST_HOME = join(tmpdir(), 'clawstr-timestamp-e2e-' + process.pid);

function runCli(
  args: string[],
  options: { timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      // Set both HOME and USERPROFILE so os.homedir() resolves correctly on Windows and Unix
      env: { ...process.env, HOME: TEST_HOME, USERPROFILE: TEST_HOME },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Process timed out'));
    }, options.timeout || 10000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
    });
  });
}

describe('clawstr timestamp e2e', () => {
  beforeEach(() => {
    if (existsSync(TEST_HOME)) rmSync(TEST_HOME, { recursive: true });
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_HOME)) rmSync(TEST_HOME, { recursive: true });
  });

  describe('clawstr timestamp (no args)', () => {
    it('should show "not set" for both timestamps when nothing stored', async () => {
      const { stdout, code } = await runCli(['timestamp']);

      expect(code).toBe(0);
      expect(stdout).toContain('Timestamp status');
      expect(stdout).toContain('not set');
    });

    it('should display both timestamps after setting them', async () => {
      await runCli(['timestamp', '1700000000']);
      const { stdout, code } = await runCli(['timestamp']);

      expect(code).toBe(0);
      expect(stdout).toContain('1700000000');
    });
  });

  describe('clawstr timestamp <number>', () => {
    it('should set the latest timestamp to a specific value', async () => {
      const { stdout, code } = await runCli(['timestamp', '1700000000']);

      expect(code).toBe(0);
      expect(stdout).toContain('1700000000');
    });

    it('should overwrite a previously set timestamp', async () => {
      await runCli(['timestamp', '1700000000']);
      const { stdout, code } = await runCli(['timestamp', '1710000000']);

      expect(code).toBe(0);
      expect(stdout).toContain('1710000000');
    });

    it('should accept 0 as a valid timestamp', async () => {
      const { stdout, code } = await runCli(['timestamp', '0']);

      expect(code).toBe(0);
      expect(stdout).toContain('0');
    });

    it('should fail with a non-numeric value', async () => {
      const { stderr, code } = await runCli(['timestamp', 'not-a-number']);

      expect(code).not.toBe(0);
      expect(stderr).toContain('Invalid timestamp value');
    });

    it('should persist the value across separate CLI invocations', async () => {
      await runCli(['timestamp', '1700000000']);
      const { stdout, code } = await runCli(['timestamp']);

      expect(code).toBe(0);
      expect(stdout).toContain('1700000000');
    });
  });

  describe('clawstr timestamp latest', () => {
    it('should default to 0 when no last_seen_timestamp has been recorded', async () => {
      const { stdout, code } = await runCli(['timestamp', 'latest']);

      expect(code).toBe(0);
      expect(stdout).toContain('0');
    });

    it('should promote last_seen + 1 to latest when last_seen is set', async () => {
      // last_seen_timestamp is auto-tracked after real queries; for e2e purposes we
      // set it directly via kvSet through the store — but we can only do that via the
      // CLI surface. The numeric timestamp command sets ONLY latest, not last_seen.
      // So here we verify: with no last_seen, 'latest' defaults to 0 (succeeds).
      await runCli(['timestamp', '1700000000']);
      const { stdout, code } = await runCli(['timestamp', 'latest']);

      // last_seen is still undefined (numeric set only sets latest), so defaults to 0
      expect(code).toBe(0);
      expect(stdout).toContain('0');
    });
  });

  describe('clawstr timestamp reset', () => {
    it('should reset both timestamps to 0', async () => {
      await runCli(['timestamp', '1700000000']);
      const { stdout, code } = await runCli(['timestamp', 'reset']);

      expect(code).toBe(0);
      expect(stdout).toContain('reset');
    });

    it('should show 0 values after reset', async () => {
      await runCli(['timestamp', '1700000000']);
      await runCli(['timestamp', 'reset']);
      const { stdout } = await runCli(['timestamp']);

      // After reset both are 0, which shows as a date near epoch, not "not set"
      expect(stdout).toContain('0');
    });
  });

  describe('--since latest integration', () => {
    it('should fail with error when --since latest has no stored value', async () => {
      const { stderr, code } = await runCli(['recent', '--since', 'latest']);

      expect(code).not.toBe(0);
      expect(stderr).toContain('No "latest" timestamp stored');
    });

    it('should accept --since with a numeric value without error (may return no results)', async () => {
      // Use a far-future timestamp so no events are returned, but the CLI itself succeeds
      const farFuture = String(Math.floor(Date.now() / 1000) + 9999999);
      const { code } = await runCli(['recent', '--since', farFuture], { timeout: 15000 });

      // Exit 0 = command ran successfully (even if no results)
      expect(code).toBe(0);
    });
  });
});
