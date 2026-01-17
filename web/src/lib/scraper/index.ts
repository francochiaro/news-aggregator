/**
 * Web scraper for fetching article content from tracking URLs
 */

export interface ScrapedArticle {
  url: string;
  finalUrl: string;
  title?: string;
  content: string;
  excerpt?: string;
  error?: string;
}

/**
 * Resolve a tracking URL to its final destination
 */
export async function resolveTrackingUrl(trackingUrl: string): Promise<string> {
  try {
    // First try to extract URL from the tracking URL itself
    // TL;DR format: https://tracking.tldrnewsletter.com/CL0/https:%2F%2Flinks.tldrnewsletter.com%2FXXX/...
    const encodedUrlMatch = trackingUrl.match(/https?%3A%2F%2F[^/]+%2F[^/]+/i);
    if (encodedUrlMatch) {
      const decodedUrl = decodeURIComponent(encodedUrlMatch[0]);
      // This is still a links.tldrnewsletter.com URL, need to follow it
      return await followRedirects(decodedUrl);
    }

    // Otherwise follow redirects directly
    return await followRedirects(trackingUrl);
  } catch (error) {
    console.error('Error resolving tracking URL:', error);
    return trackingUrl;
  }
}

/**
 * Follow redirects to get the final URL
 */
async function followRedirects(url: string, maxRedirects = 5): Promise<string> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Handle relative URLs
          currentUrl = new URL(location, currentUrl).href;
          redirectCount++;
          continue;
        }
      }

      // No more redirects
      return currentUrl;
    } catch (error) {
      // If HEAD fails, try with GET
      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            currentUrl = new URL(location, currentUrl).href;
            redirectCount++;
            continue;
          }
        }

        return currentUrl;
      } catch {
        return currentUrl;
      }
    }
  }

  return currentUrl;
}

/**
 * Scrape article content from a URL
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  try {
    // Resolve tracking URL first
    const finalUrl = await resolveTrackingUrl(url);

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return {
        url,
        finalUrl,
        content: '',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const extracted = extractArticleContent(html);

    return {
      url,
      finalUrl,
      title: extracted.title,
      content: extracted.content,
      excerpt: extracted.excerpt,
    };
  } catch (error) {
    return {
      url,
      finalUrl: url,
      content: '',
      error: error instanceof Error ? error.message : 'Failed to scrape article',
    };
  }
}

/**
 * Extract article content from HTML
 */
function extractArticleContent(html: string): {
  title?: string;
  content: string;
  excerpt?: string;
} {
  // Remove scripts, styles, and comments
  let cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // Extract title
  const titleMatch = cleanHtml.match(/<title[^>]*>([^<]+)<\/title>/i) ||
    cleanHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
    cleanHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : undefined;

  // Extract meta description for excerpt
  const metaDescMatch = cleanHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    cleanHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const excerpt = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1]).trim() : undefined;

  // Try to find main article content
  let content = '';

  // Look for article tag
  const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    content = articleMatch[1];
  } else {
    // Look for main tag
    const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      content = mainMatch[1];
    } else {
      // Look for common article content divs
      const contentPatterns = [
        /<div[^>]*class=["'][^"']*(?:article|content|post|entry|story)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*id=["'][^"']*(?:article|content|post|entry|story)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      ];

      for (const pattern of contentPatterns) {
        const matches = [...cleanHtml.matchAll(pattern)];
        if (matches.length > 0) {
          content = matches.map(m => m[1]).join('\n');
          break;
        }
      }
    }
  }

  // If no structured content found, extract from body
  if (!content) {
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    } else {
      content = cleanHtml;
    }
  }

  // Convert to plain text
  content = htmlToText(content);

  // Limit content length
  if (content.length > 10000) {
    content = content.substring(0, 10000);
    const lastPeriod = content.lastIndexOf('.');
    if (lastPeriod > 8000) {
      content = content.substring(0, lastPeriod + 1);
    }
  }

  return { title, content, excerpt };
}

/**
 * Convert HTML to plain text
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Batch scrape multiple articles with rate limiting
 */
export async function scrapeArticles(
  urls: string[],
  options: { delayMs?: number; maxConcurrent?: number } = {}
): Promise<ScrapedArticle[]> {
  const { delayMs = 1000, maxConcurrent = 3 } = options;
  const results: ScrapedArticle[] = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(url => scrapeArticle(url))
    );

    results.push(...batchResults);

    // Delay between batches to be respectful to servers
    if (i + maxConcurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
