import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma'; // Import singleton instance
// import { PrismaClient } from '@/generated/prisma'; // Remove direct import

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_PAT = process.env.GITHUB_PAT;
const CRON_SECRET = process.env.CRON_SECRET;

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
}

// Helper to fetch recent commits
async function getGitHubCommits(repo: string): Promise<GitHubCommit[] | null> {
  if (!GITHUB_PAT) {
    console.warn('GITHUB_PAT is not set. Skipping GitHub commit fetch.');
    return null;
  }
  if (!repo || !repo.includes('/')) {
      console.warn(`Invalid repo format: ${repo}. Skipping.`);
      return null;
  }
  const url = `${GITHUB_API_URL}/repos/${repo}/commits?per_page=5`; // Fetch last 5
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
    });
    if (!response.ok) {
      console.error(`Failed to fetch commits for ${repo}: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching commits for ${repo}:`, error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check Cron Secret Authorization
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  console.log('Running changelog collector cron job (GitHub Commits)...');

  try {
    const projects = await prisma.project.findMany({
      where: { repoUrl: { not: null } },
      select: { id: true, repoUrl: true },
    });

    if (projects.length === 0) {
      console.log('No projects with GitHub repos found to collect commits for.');
      return res.status(200).json({ message: 'No projects with GitHub repos found' });
    }

    let addedCount = 0;
    for (const project of projects) {
      if (!project.repoUrl) continue;

      const commits = await getGitHubCommits(project.repoUrl);
      if (!commits) continue;

      // Get existing commit shas for this project to avoid duplicates
      const existingEntries = await prisma.changeLogEntry.findMany({
        where: {
          projectId: project.id,
          provider: 'github_commit'
        },
        select: { message: true } // Assuming SHA is stored in message or meta
      });
      const existingShas = new Set(existingEntries.map(e => e.message.split('\n')[0])); // Simple check based on first line (SHA)

      for (const commit of commits) {
        const commitSha = commit.sha;
        const commitMessage = `${commitSha}\n${commit.commit.message}`;
        
        if (existingShas.has(commitSha)) {
           console.log(`Skipping existing commit ${commitSha.substring(0,7)} for project ${project.id}`);
           continue; // Skip if SHA already exists
        }

        await prisma.changeLogEntry.create({
          data: {
            projectId: project.id,
            provider: 'github_commit',
            message: commitMessage, // Store SHA and message
            createdAt: new Date(commit.commit.committer.date), // Use committer date
            meta: { // Store additional useful info
              url: commit.html_url,
              author: commit.commit.author.name,
              committer: commit.commit.committer.name,
            }
          },
        });
        addedCount++;
        // Update project lastActivityAt based on latest commit
        await prisma.project.update({
           where: { id: project.id },
           data: { lastActivityAt: new Date(commit.commit.committer.date) }
        });
      }
    }

    console.log(`Added ${addedCount} new commit changelog entries.`);
    return res.status(200).json({ message: `Added ${addedCount} new entries.` });

  } catch (error) {
    console.error('Changelog collector cron job failed:', error);
    return res.status(500).json({ message: 'Cron job failed', error: (error as Error).message });
  }
} 