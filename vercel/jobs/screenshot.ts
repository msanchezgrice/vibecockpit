import prisma from '@/lib/prisma';

/**
 * Vercel Cron Job: Update thumbUrl for projects that don't have one
 * This job runs on a schedule defined in vercel.json
 */
export async function processScreenshots() {
  try {
    console.log('Starting screenshot job');
    
    // Find all projects without a thumbUrl
    const projects = await prisma.project.findMany({
      where: {
        thumbUrl: null,
      },
      select: {
        id: true,
        name: true,
        url: true,
      },
    });
    
    console.log(`Found ${projects.length} projects without thumbnails`);
    
    if (projects.length === 0) {
      return { success: true, message: 'No projects to process' };
    }
    
    // Update each project with a placeholder thumbnail
    // In Sprint 02, this will be replaced with actual screenshot capture
    const updatePromises = projects.map(project => 
      prisma.project.update({
        where: { id: project.id },
        data: { thumbUrl: '/images/thumb-placeholder.png' },
      })
    );
    
    await Promise.all(updatePromises);
    
    console.log(`Updated ${projects.length} projects with placeholder thumbnails`);
    
    return {
      success: true,
      message: `Processed ${projects.length} projects`,
    };
  } catch (error) {
    console.error('Error in screenshot job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// If this file is executed directly (for testing)
if (require.main === module) {
  processScreenshots()
    .then(result => console.log('Screenshot job completed:', result))
    .catch(error => console.error('Screenshot job failed:', error))
    .finally(() => prisma.$disconnect());
} 