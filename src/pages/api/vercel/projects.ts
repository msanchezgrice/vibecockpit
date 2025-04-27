import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

const VERCEL_API_URL = 'https://api.vercel.com';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

interface VercelProject {
  id: string;
  name: string;
}

// Type for the raw project object from Vercel API response
interface RawVercelProject {
    id: string;
    name: string;
    // Add other fields if needed, but these are sufficient for mapping
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!VERCEL_TOKEN) {
    console.error('VERCEL_TOKEN environment variable is not set.');
    return res.status(500).json({ message: 'Vercel token configuration error.' });
  }

  if (req.method === 'GET') {
    try {
      const url = `${VERCEL_API_URL}/v9/projects`; // Endpoint to list projects
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to fetch Vercel projects: ${response.status}`, errorData);
        throw new Error(errorData.error?.message || 'Failed to fetch Vercel projects');
      }

      const data = await response.json();
      // Use the specific type in map
      const projects: VercelProject[] = data.projects.map((p: RawVercelProject) => ({ id: p.id, name: p.name }));
      
      res.status(200).json(projects);

    } catch (error) {
      console.error('Error fetching Vercel projects:', error);
      res.status(500).json({ message: (error as Error).message || 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 