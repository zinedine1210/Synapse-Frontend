/**
 * Pure utility functions for Q&A SEO metadata generation.
 * Extracted from src/app/qna/[slug]/page.tsx for testability.
 */

export interface QnaQuestion {
  title: string;
  body: string;
  slug: string;
  answers?: QnaAnswer[];
}

export interface QnaAnswer {
  body: string;
  isApprovedByAsker?: boolean;
  upvotes?: number;
}

export interface QnaMetadata {
  title: string;
  description: string;
  openGraph: {
    title: string;
    description: string;
    type: string;
    siteName: string;
    url: string;
  };
}

/**
 * Strip markdown/HTML to produce plain text for SEO meta descriptions.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`[^`]*`/g, '')        // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links → text only
    .replace(/#{1,6}\s?/g, '')       // headings
    .replace(/[*_~]{1,3}/g, '')      // bold/italic/strikethrough
    .replace(/>\s?/g, '')            // blockquotes
    .replace(/[-*+]\s/g, '')         // unordered lists
    .replace(/\d+\.\s/g, '')         // ordered lists
    .replace(/<[^>]+>/g, '')         // HTML tags
    .replace(/\n+/g, ' ')           // newlines → space
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

/**
 * Generate SEO metadata for a Q&A question page.
 *
 * Rules:
 * - Title: "{question.title} - Synapse Q&A"
 * - Description: stripped markdown from best (approved) answer body,
 *   or question body if no approved answer, truncated to 160 chars
 * - OpenGraph properties include title, description, type, siteName, url
 */
export function generateQnaMetadata(question: QnaQuestion): QnaMetadata {
  // Derive description: best (approved) answer body → question body → fallback
  const bestAnswerBody = question.answers?.find((a) => a.isApprovedByAsker)?.body;
  const rawDescription = bestAnswerBody || question.body || `Lihat jawaban untuk: ${question.title}`;
  const description = stripMarkdown(rawDescription).slice(0, 160);

  const title = `${question.title} - Synapse Q&A`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Synapse',
      url: `/qna/${question.slug}`,
    },
  };
}
