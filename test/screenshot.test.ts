import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureScreenshot, updateProjectThumbnail } from '@/lib/snap';
import prisma from '@/lib/prisma';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    project: {
      update: vi.fn().mockResolvedValue({
        id: 'test-project-id',
        thumbUrl: '/images/thumb-placeholder.png'
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'test-project-id',
          name: 'Test Project',
          frontendUrl: 'https://example.com'
        }
      ])
    }
  }
}));

describe('Screenshot functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captureScreenshot should return placeholder URL', async () => {
    const result = await captureScreenshot('https://example.com');
    expect(result).toBe('/images/thumb-placeholder.png');
  });

  it('updateProjectThumbnail should call prisma update with correct params', async () => {
    const projectId = 'test-project-id';
    const thumbUrl = '/images/test-thumb.png';
    
    await updateProjectThumbnail(projectId, thumbUrl);
    
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: projectId },
      data: { thumbUrl }
    });
  });
}); 