import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Function to generate a random string to replace uuid
function generateRandomId(length: number = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Allow file uploads by disabling the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// For now, we'll implement a mockup version until we can properly configure formidable
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Generate a mock image URL using our random string function
    const mockImageId = generateRandomId();
    const imageUrl = `/uploads/${mockImageId}.jpg`;

    // In a real implementation, we would save the file here
    // For now, we'll just return a mock URL that the frontend can use

    return res.status(200).json({ 
      message: 'Image upload simulated successfully',
      imageUrl,
    });
  } catch (error) {
    console.error('Error handling image upload:', error);
    return res.status(500).json({ 
      message: 'Error handling image upload',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 