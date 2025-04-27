import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@/generated/prisma'; // Import PrismaClient

const prisma = new PrismaClient(); // Initialize Prisma Client
const VERCEL_API_URL = 'https://api.vercel.com';
// const VERCEL_TOKEN = process.env.VERCEL_TOKEN; // No longer use global token

interface VercelProject {
  id: string;
  name: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  // Make sure user is logged in and we have their ID
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = session.user.id;

  // Remove check for global VERCEL_TOKEN
  // if (!VERCEL_TOKEN) { ... }

  if (req.method === 'GET') {
    try {
      // Find the user's Vercel account record
      const vercelAccount = await prisma.account.findFirst({
        where: { userId: userId, provider: 'vercel' },
        select: { access_token: true },
      });

      if (!vercelAccount?.access_token) {
        return res.status(403).json({ message: 'Vercel account not linked or token missing.' });
      }
      const accessToken = vercelAccount.access_token;

      const url = `${VERCEL_API_URL}/v9/projects`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Use USER's access token
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to fetch Vercel projects for user ${userId}: ${response.status}`, errorData);
        // Check if token expired (e.g., 401 or 403 from Vercel)
        if (response.status === 401 || response.status === 403) {
             return res.status(401).json({ message: 'Vercel token invalid or expired. Please reconnect.' });
        }
        throw new Error(errorData.error?.message || 'Failed to fetch Vercel projects');
      }

      const data = await response.json();
      const projects: VercelProject[] = data.projects.map((p: { id: string, name: string }) => ({ 
        id: p.id, 
        name: p.name 
      }));
      res.status(200).json(projects);

    } catch (error) {
      console.error(`Error fetching Vercel projects for user ${userId}:`, error);
      res.status(500).json({ message: (error as Error).message || 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 