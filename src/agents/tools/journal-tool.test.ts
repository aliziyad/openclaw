import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJournalTool } from './journal-tool.js';
import fs from 'node:fs/promises';
import path from 'node:path';

vi.mock('node:fs/promises');
vi.mock('../../memory/internal.js', () => ({
  ensureDir: vi.fn(),
}));

describe('journal_log tool', () => {
  const mockConfig = {};
  const workspaceDir = '/mock/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a journal entry correctly', async () => {
    const tool = createJournalTool({
      config: mockConfig as any,
      workspaceDir,
    });

    expect(tool).not.toBeNull();
    if (!tool) return;

    const params = {
      taskName: 'Test Task',
      summary: 'Completed test task successfully',
      steps: ['Step 1', 'Step 2'],
      shortcuts: ['Use shortcut A'],
      outcome: 'success'
    };

    const result = await tool.execute('call_123', params);
    const details = result.details as any;

    expect(details.status).toBe('logged');
    expect(details.path).toContain('test_task.md');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('test_task.md'),
      expect.stringContaining('# Task: Test Task'),
      'utf-8'
    );
  });
});
