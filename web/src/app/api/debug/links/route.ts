import { NextRequest, NextResponse } from 'next/server';
import { fetchTLDREmails } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);

    const emails = await fetchTLDREmails(startDate, endDate);

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No emails found' });
    }

    const firstEmail = emails[0];
    const html = firstEmail.htmlBody || '';

    // Find ALL links in the email
    const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi;
    const allLinks: Array<{ url: string; text: string }> = [];

    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text.length > 3) {
        allLinks.push({ url: url.substring(0, 200), text: text.substring(0, 100) });
      }
    }

    // Group links by domain
    const byDomain: Record<string, Array<{ url: string; text: string }>> = {};
    for (const link of allLinks) {
      try {
        const domain = new URL(link.url).hostname;
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(link);
      } catch {
        if (!byDomain['invalid']) byDomain['invalid'] = [];
        byDomain['invalid'].push(link);
      }
    }

    return NextResponse.json({
      emailSubject: firstEmail.subject,
      totalLinks: allLinks.length,
      linksByDomain: Object.entries(byDomain).map(([domain, links]) => ({
        domain,
        count: links.length,
        examples: links.slice(0, 3),
      })),
      // Show a chunk of HTML from the middle of the email (where content likely is)
      htmlMiddle: html.substring(Math.floor(html.length / 3), Math.floor(html.length / 3) + 3000),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
