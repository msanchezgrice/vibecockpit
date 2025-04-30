import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma'; // Import singleton instance
// import { PrismaClient } from '@/generated/prisma'; // Remove direct import
// import { Octokit } from 'octokit'; // Removed accidental import

// const prisma = new PrismaClient(); // Remove direct instantiation
const GITHUB_API_URL = 'https://api.github.com';

interface GitHubRepo {
  id: number; // GitHub repo ID
  name: string; // Just the repo name
  full_name: string; // owner/repo format
  private: boolean;
}

// Type for the raw repo object from GitHub API response
interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  // Add other fields if needed
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) { // Ensure we have user ID from session
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Find the user's GitHub account record to get the access token
      const githubAccount = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: 'github',
        },
        select: {
          access_token: true,
        },
      });

      if (!githubAccount?.access_token) {
        return res.status(403).json({ message: 'GitHub account not linked or token missing.' });
      }

      const accessToken = githubAccount.access_token;
      
      // Fetch user repos from GitHub API
      // Paginate or filter further if needed (e.g., type=owner, sort=updated)
      const url = `${GITHUB_API_URL}/user/repos?sort=updated&per_page=100`; 
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to fetch GitHub repos: ${response.status}`, errorData);
        throw new Error(errorData.message || 'Failed to fetch GitHub repos');
      }

      // Use the specific type for the fetched data and map callback
      const data: RawGitHubRepo[] = await response.json(); 
      const repos: GitHubRepo[] = data.map((r: RawGitHubRepo) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
      }));
      
      res.status(200).json(repos);

    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      res.status(500).json({ message: (error as Error).message || 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 