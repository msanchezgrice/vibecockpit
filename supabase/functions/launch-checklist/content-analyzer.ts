// content-analyzer.ts - Utility functions for extracting context from websites and GitHub repos

/**
 * Fetches content from a website URL and extracts key information
 * @param url The website URL to analyze
 * @returns Object containing extracted information
 */
export async function analyzeWebsite(url: string): Promise<string> {
  if (!url || !url.trim().startsWith('http')) {
    return "No valid website URL provided.";
  }

  try {
    console.log(`Attempting to fetch website content from: ${url}`);
    
    // Fetch website content with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VibeCockpit/1.0; +https://vibecockpit.vercel.app)'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return `Website fetch failed with status: ${response.status} ${response.statusText}`;
    }
    
    // Get content type from headers
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return `Website returned non-HTML content (${contentType})`;
    }
    
    // Get HTML content
    const html = await response.text();
    
    // Extract key information from HTML
    const title = extractTagContent(html, 'title') || 'No title found';
    const description = extractMetaContent(html, 'description') || 'No description found';
    const h1Headers = extractAllTagContent(html, 'h1');
    const h2Headers = extractAllTagContent(html, 'h2').slice(0, 5); // Limit to first 5 h2s
    
    // Extract visible text without HTML tags for semantic analysis
    // This is a simple approach - in production you might want a more robust solution
    const textContent = extractTextContent(html).slice(0, 2000); // First 2000 chars
    
    return `
Website Analysis for ${url}:
Title: ${title}
Description: ${description}
Primary Headings: ${h1Headers.join(', ')}
Secondary Headings: ${h2Headers.join(', ')}
Content Summary: ${textContent.substring(0, 300)}...
    `.trim();
    
  } catch (error) {
    console.error('Error analyzing website:', error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return "Website analysis timed out after 10 seconds.";
    }
    return `Error analyzing website: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Fetches information from a GitHub repository
 * @param repoUrl GitHub repository URL 
 * @returns Repository information
 */
export async function analyzeGitHubRepo(repoUrl: string): Promise<string> {
  if (!repoUrl || !repoUrl.includes('github.com')) {
    return "No valid GitHub repository URL provided.";
  }
  
  try {
    console.log(`Analyzing GitHub repository: ${repoUrl}`);
    
    // Parse owner and repo from URL
    // Example URL formats: 
    // - https://github.com/owner/repo
    // - github.com/owner/repo
    // - github.com/owner/repo.git
    const urlParts = repoUrl.split('github.com/')[1]?.replace('.git', '').split('/');
    if (!urlParts || urlParts.length < 2) {
      return "Could not parse GitHub repository owner and name from URL.";
    }
    
    const [owner, repo] = urlParts;
    const githubToken = Deno.env.get("GITHUB_PAT");
    
    if (!githubToken) {
      return "GitHub analysis limited: No GitHub access token available.";
    }
    
    // Fetch repository info
    const repoInfo = await fetchGitHubRepoInfo(owner, repo, githubToken);
    
    // Fetch README content if available
    let readmeContent = "";
    try {
      readmeContent = await fetchGitHubReadme(owner, repo, githubToken);
      // Truncate README to a reasonable length
      if (readmeContent.length > 500) {
        readmeContent = readmeContent.substring(0, 497) + '...';
      }
    } catch (error) {
      readmeContent = "README not available or could not be fetched.";
    }
    
    return `
GitHub Repository Analysis for ${repoUrl}:
Name: ${repoInfo.name}
Description: ${repoInfo.description || 'No description'}
Language: ${repoInfo.language || 'Not specified'}
Topics: ${repoInfo.topics?.join(', ') || 'None'}
README Summary: ${readmeContent}
    `.trim();
    
  } catch (error) {
    console.error('Error analyzing GitHub repository:', error);
    return `Error analyzing GitHub repository: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Helper functions

/**
 * Extracts content from an HTML tag
 */
function extractTagContent(html: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'is');
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Extracts all instances of content from a specific HTML tag
 */
function extractAllTagContent(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'gis');
  const matches = Array.from(html.matchAll(regex));
  return matches.map(match => match[1].trim()).filter(Boolean);
}

/**
 * Extracts content from meta tags
 */
function extractMetaContent(html: string, name: string): string {
  const regex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*>`, 'i');
  const match = html.match(regex);
  return match ? (match[1] || match[2]).trim() : '';
}

/**
 * Extracts readable text content from HTML
 */
function extractTextContent(html: string): string {
  // Remove scripts, styles, and SVG content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  
  // Remove HTML tags and decode entities
  text = text.replace(/<[^>]*>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Fetches GitHub repository information
 */
async function fetchGitHubRepoInfo(owner: string, repo: string, token: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Vibe-Cockpit-App'
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Fetches README content from a GitHub repository
 */
async function fetchGitHubReadme(owner: string, repo: string, token: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Vibe-Cockpit-App'
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub README fetch failed: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.content) {
    throw new Error('README content not found');
  }
  
  // README content is base64 encoded
  const decoded = atob(data.content.replace(/\n/g, ''));
  return decoded;
} 