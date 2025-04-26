import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // IMPORTANT: Add authentication check for production cron jobs!

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  console.log('Running analytics collector cron job...');

  try {
    const projects = await prisma.project.findMany({
      select: { id: true }, // Only fetch IDs
    });

    if (projects.length === 0) {
      console.log('No projects found to snapshot analytics for.');
      return res.status(200).json({ message: 'No projects found' });
    }

    const snapshotPromises = projects.map((project) => {
      // Simulate fetching analytics - generate random numbers
      const randomVisits = Math.floor(Math.random() * 1000); // 0-999 visits
      const randomSignups = Math.floor(Math.random() * (randomVisits / 10 + 1)); // 0-~10% of visits

      return prisma.analyticsSnapshot.create({
        data: {
          projectId: project.id,
          visits: randomVisits,
          signups: randomSignups,
        },
      });
    });

    const results = await Promise.all(snapshotPromises);

    console.log(`Created ${results.length} analytics snapshots.`);
    return res.status(200).json({ message: `Created ${results.length} analytics snapshots.` });

  } catch (error) {
    console.error('Analytics collector cron job failed:', error);
    return res.status(500).json({ message: 'Cron job failed', error: (error as Error).message });
  }
} 