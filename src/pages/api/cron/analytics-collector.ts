import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

const VERCEL_API_URL = 'https://api.vercel.com';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper function to fetch Vercel "visits" (using usage endpoint as proxy)
async function getVercelProjectVisits(projectId: string): Promise<number | null> {
  if (!VERCEL_TOKEN) {
    console.warn('VERCEL_TOKEN is not set. Skipping Vercel visit fetch.');
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
      console.error(`Failed to fetch Vercel usage (for visits) for ${projectId}: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    // Use 'visits' field if available, otherwise fallback or use another metric as proxy
    // This endpoint isn't ideal for visits, real Vercel Analytics API is better.
    return data.visits ?? data.analytics?.totalVisitors ?? 0; // Example fallback logic
  } catch (error) {
    console.error(`Error fetching Vercel usage (for visits) for ${projectId}:`, error);
    return null;
  }
}

// Helper function to fetch Supabase sign-up count
async function getSupabaseSignupCount(): Promise<number | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('Supabase URL or Service Key not set. Skipping Supabase signup fetch.');
    return null;
  }
  // Construct the URL for the users endpoint
  // Ensure SUPABASE_URL does not end with a slash
  const baseUrl = SUPABASE_URL.endsWith('/') ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  const url = `${baseUrl}/auth/v1/users?limit=1`; // Limit=1 just to get count

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Range': '0-0' // Request only range 0-0 to get total count in Content-Range
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Supabase users: ${response.status} ${response.statusText}`);
      return null;
    }

    // Extract total count from Content-Range header (e.g., "items 0-0/150")
    const contentRange = response.headers.get('content-range');
    const totalMatch = contentRange?.match(/\/(\d+)$/);
    const totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    return totalCount;

  } catch (error) {
    console.error('Error fetching Supabase users:', error);
    return null;
  }
}

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
    // Fetch Supabase count once
    const signupCount = await getSupabaseSignupCount();

    const projects = await prisma.project.findMany({
      where: { vercelProjectId: { not: null } }, // Only projects linked to Vercel for visits
      select: { id: true, vercelProjectId: true },
    });

    if (projects.length === 0) {
      console.log('No projects with Vercel IDs found to snapshot analytics for.');
      return res.status(200).json({ message: 'No projects with Vercel IDs found' });
    }

    let createdCount = 0;
    for (const project of projects) {
       if (!project.vercelProjectId) continue;

       const visitCount = await getVercelProjectVisits(project.vercelProjectId);

       // For now, we assign the total supabase auth user count to every project
       // A real implementation might filter Supabase users based on project association
       const projectSignupCount = signupCount ?? 0;

       await prisma.analyticsSnapshot.create({
         data: {
           projectId: project.id,
           visits: visitCount ?? 0, // Default to 0 if fetch failed
           signups: projectSignupCount,
         },
       });
       createdCount++;
    }

    console.log(`Created ${createdCount} analytics snapshots.`);
    return res.status(200).json({ message: `Created ${createdCount} analytics snapshots.` });

  } catch (error) {
    console.error('Analytics collector cron job failed:', error);
    return res.status(500).json({ message: 'Cron job failed', error: (error as Error).message });
  }
} 