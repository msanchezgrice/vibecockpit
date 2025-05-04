import type { NextApiRequest, NextApiResponse } from 'next';
import screenshotJob from '@/../vercel/jobs/screenshot';

type ScreenshotCollectorResponse = {
  message: string;
};

/**
 * API endpoint for the screenshot collector cron job
 * This gets triggered daily by Vercel Cron
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScreenshotCollectorResponse>
) {
  // Verify it's a GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify the request is from Vercel Cron
  // In production, add authentication for the cron job
  const cronHeaderValue = req.headers['x-vercel-cron'];
  
  // For development, allow direct access
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev && !cronHeaderValue) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('Screenshot collector cron job started');
    
    // Run the screenshot job
    await screenshotJob();
    
    console.log('Screenshot collector cron job completed');
    
    return res.status(200).json({ message: 'Screenshot collection completed successfully' });
  } catch (error) {
    console.error('Screenshot collector cron job failed:', error);
    return res.status(500).json({ message: 'Failed to collect screenshots' });
  }
} 