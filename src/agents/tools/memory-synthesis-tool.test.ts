import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemorySynthesizeTool } from './memory-synthesis-tool.js';
import path from 'node:path';

vi.mock('../../memory/internal.js', () => ({
  ensureDir: vi.fn(),
}));

describe('memory_synthesize tool', () => {
  const mockConfig = {};
  const workspaceDir = '/mock/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes correctly and returns ready status', async () => {
    const tool = createMemorySynthesizeTool({
      config: mockConfig as any,
      workspaceDir,
    });

    expect(tool).not.toBeNull();
    if (!tool) return;

    const params = {
      targetSopName: 'Test SOP',
      instructions: 'Refine this task'
    };

    const result = await tool.execute('call_synthesis', params);
    const details = result.details as any;

    expect(details.status).toBe('ready_for_synthesis');
    expect(details.sopPath).toContain('test_sop.md');
  });
});
