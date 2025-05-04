import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Allow file uploads by disabling the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    // Parse the incoming form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      uploadDir: path.join(process.cwd(), 'public/uploads'),
      keepExtensions: true,
      filename: (_name, _ext, part) => {
        const uniqueFilename = `${uuidv4()}${path.extname(part.originalFilename || '')}`;
        return uniqueFilename;
      },
    });

    // Make sure the upload directory exists
    await fs.mkdir(path.join(process.cwd(), 'public/uploads'), { recursive: true });

    // Parse the form
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.image as formidable.File;
    
    if (!file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Get the file path relative to the public directory
    const relativePath = path.relative(path.join(process.cwd(), 'public'), file.filepath);
    const imageUrl = `/${relativePath.replace(/\\/g, '/')}`;

    return res.status(200).json({ 
      message: 'Image uploaded successfully',
      imageUrl,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ 
      message: 'Error uploading image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 