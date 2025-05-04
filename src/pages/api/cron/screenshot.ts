import { NextApiRequest, NextApiResponse } from 'next';
import { processScreenshots } from '../../../../vercel/jobs/screenshot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify that this is a Vercel cron invocation
    // In production, we'd use a more secure verification
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === 'production' && (!authHeader || !authHeader.startsWith('Bearer '))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Process screenshots
    const result = await processScreenshots();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Screenshot cron job error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 