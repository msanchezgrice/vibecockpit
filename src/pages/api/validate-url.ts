import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ message: 'Invalid URL protocol' });
    }

    // Try to fetch the URL to check if it exists
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'BuildDeck-Validator/1.0',
        },
      });

      // Accept 2xx and 3xx status codes
      if (response.status >= 200 && response.status < 400) {
        return res.status(200).json({ valid: true });
      } else {
        return res.status(400).json({ message: 'URL returned an error status', status: response.status });
      }
    } catch (fetchError) {
      return res.status(400).json({ message: 'Could not connect to URL' });
    }
  } catch (error) {
    return res.status(400).json({ message: 'Invalid URL format' });
  }
} 