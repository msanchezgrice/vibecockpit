import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const accounts = await prisma.account.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          provider: true, // Only select the provider name
        },
      });

      const linkedProviders = accounts.map(acc => acc.provider);
      res.status(200).json({ linkedProviders });

    } catch (error) {
      console.error('Error fetching linked accounts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 