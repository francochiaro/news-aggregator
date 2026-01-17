import { NextRequest, NextResponse } from 'next/server';
import { fetchTLDREmails } from '@/lib/gmail';
import { parseNewsletterContent } from '@/lib/gmail/parser';

export async function GET(request: NextRequest) {
  try {
    // Fetch last 3 days of emails
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);

    console.log('Fetching emails from', startDate, 'to', endDate);
    const emails = await fetchTLDREmails(startDate, endDate);
    console.log('Found', emails.length, 'emails');

    if (emails.length === 0) {
      return NextResponse.json({
        error: 'No emails found',
        suggestion: 'Make sure you have TL;DR newsletters in your Gmail',
      });
    }

    // Parse first email and show results
    const firstEmail = emails[0];
    const articles = parseNewsletterContent(firstEmail);

    // Also return a snippet of the raw HTML for debugging
    const htmlSnippet = firstEmail.htmlBody?.substring(0, 2000) || 'No HTML body';

    return NextResponse.json({
      emailCount: emails.length,
      firstEmailSubject: firstEmail.subject,
      firstEmailDate: firstEmail.date,
      articlesFound: articles.length,
      articles: articles.slice(0, 5).map(a => ({
        title: a.title,
        summary: a.summary.substring(0, 200) + '...',
        sourceUrl: a.sourceUrl,
        readingTime: a.readingTime,
        section: a.section,
      })),
      htmlSnippet: htmlSnippet,
    });
  } catch (error) {
    console.error('Debug parser error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
