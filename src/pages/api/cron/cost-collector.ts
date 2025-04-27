import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

const VERCEL_API_URL = 'https://api.vercel.com';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

// Helper function to fetch Vercel usage
async function getVercelProjectUsage(projectId: string): Promise<{ cost: number } | null> {
  if (!VERCEL_TOKEN) {
    console.warn('VERCEL_TOKEN is not set. Skipping Vercel cost fetch.');
    return null;
  }

  const url = `${VERCEL_API_URL}/v9/projects/${projectId}/usage`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Vercel usage for ${projectId}: ${response.status} ${response.statusText}`);
      // Log body for more details if needed
      // const errorBody = await response.text();
      // console.error('Vercel API Error Body:', errorBody);
      return null;
    }

    const data = await response.json();
    // The usage endpoint returns cost directly for Pro plans, or needs calculation for others.
    // We'll assume `data.cost` exists for simplicity.
    // See: https://vercel.com/docs/rest-api/endpoints/projects#get-project-usage-metrics
    return { cost: data.cost ?? 0 }; // Default to 0 if cost isn't directly available
  } catch (error) {
    console.error(`Error fetching Vercel usage for ${projectId}:`, error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // IMPORTANT: Add authentication check for production cron jobs!
  // Example: Check Authorization header for a secret bearer token
  // const token = req.headers.authorization?.split(' ')[1];
  // if (token !== process.env.CRON_SECRET) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  console.log('Running cost collector cron job...');

  try {
    const projects = await prisma.project.findMany({
      where: { vercelProjectId: { not: null } }, // Only fetch projects with a Vercel ID
      select: { id: true, vercelProjectId: true },
    });

    if (projects.length === 0) {
      console.log('No projects with Vercel IDs found to snapshot costs for.');
      return res.status(200).json({ message: 'No projects with Vercel IDs found' });
    }

    let createdCount = 0;
    for (const project of projects) {
      if (!project.vercelProjectId) continue;

      const usage = await getVercelProjectUsage(project.vercelProjectId);
      if (usage === null) continue; // Skip if fetch failed

      await prisma.costSnapshot.create({
        data: {
          projectId: project.id,
          costAmount: usage.cost,
        },
      });
      createdCount++;
    }

    console.log(`Created ${createdCount} cost snapshots.`);
    return res.status(200).json({ message: `Created ${createdCount} cost snapshots.` });

  } catch (error) {
    console.error('Cost collector cron job failed:', error);
    return res.status(500).json({ message: 'Cron job failed', error: (error as Error).message });
  }
} 