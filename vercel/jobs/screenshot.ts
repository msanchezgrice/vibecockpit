import { captureScreenshot, updateProjectThumbnail } from '@/lib/snap';
import prisma from '@/lib/prisma';

/**
 * Vercel cron job that captures screenshots of project websites and updates thumbnails
 * Runs: Daily
 */
export default async function screenshotJob() {
  console.log('Starting screenshot job');
  
  try {
    // Get all projects with frontendUrl
    const projects = await prisma.project.findMany({
      where: {
        frontendUrl: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        frontendUrl: true,
      }
    });
    
    console.log(`Found ${projects.length} projects with frontend URLs`);
    
    // Process each project
    for (const project of projects) {
      if (!project.frontendUrl) continue;
      
      try {
        console.log(`Processing screenshot for ${project.name}`);
        
        // Capture screenshot
        const thumbUrl = await captureScreenshot(project.frontendUrl);
        
        // Update project thumbnail URL
        await updateProjectThumbnail(project.id, thumbUrl);
        
        console.log(`Successfully updated thumbnail for ${project.name}`);
      } catch (error) {
        console.error(`Error capturing screenshot for ${project.name}:`, error);
        
        // Set placeholder for failed screenshots
        await updateProjectThumbnail(project.id, '/images/thumb-placeholder.png');
      }
    }
    
    console.log('Screenshot job completed successfully');
  } catch (error) {
    console.error('Error in screenshot job:', error);
    throw error;
  }
} 