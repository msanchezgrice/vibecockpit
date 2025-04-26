import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@/generated/prisma';
import { NextResponse } from 'next/server'; // Using NextResponse for cleaner responses

const prisma = new PrismaClient();

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
      select: { id: true }, // Only fetch IDs
    });

    if (projects.length === 0) {
      console.log('No projects found to snapshot costs for.');
      return res.status(200).json({ message: 'No projects found' });
    }

    const snapshotPromises = projects.map((project) => {
      // Simulate fetching cost - generate random cost between 5 and 100
      const randomCost = Math.random() * (100 - 5) + 5;
      
      return prisma.costSnapshot.create({
        data: {
          projectId: project.id,
          costAmount: randomCost, // Prisma handles Decimal conversion
        },
      });
    });

    const results = await Promise.all(snapshotPromises);

    console.log(`Created ${results.length} cost snapshots.`);
    return res.status(200).json({ message: `Created ${results.length} cost snapshots.` });

  } catch (error) {
    console.error('Cost collector cron job failed:', error);
    return res.status(500).json({ message: 'Cron job failed', error: (error as Error).message });
  }
} 