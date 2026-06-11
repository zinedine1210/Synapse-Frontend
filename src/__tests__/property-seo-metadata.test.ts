/**
 * Property 1: SEO Metadata Generation
 * Feature: synapse-mega-upgrade, Property 1: SEO Metadata Generation
 *
 * Validates: Requirements 1.2
 *
 * For any Q&A question with a non-empty body, the generated metadata SHALL produce
 * a title matching the question title, a description of at most 160 characters
 * derived from the best answer body (or question body if no answers), and valid
 * openGraph properties.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  stripMarkdown,
  generateQnaMetadata,
  QnaQuestion,
  QnaAnswer,
} from '@/lib/qna-metadata';

// --- Arbitraries ---

/** Generate a non-empty string suitable as a question title */
const arbTitle = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);

/** Generate a non-empty body (may contain markdown) */
const arbMarkdownBody = fc.oneof(
  // Plain text
  fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
  // Markdown with headings, bold, links, code
  fc.record({
    heading: fc.string({ minLength: 1, maxLength: 50 }),
    content: fc.string({ minLength: 1, maxLength: 300 }),
    link: fc.string({ minLength: 1, maxLength: 30 }),
    code: fc.string({ minLength: 1, maxLength: 50 }),
  }).map(
    ({ heading, content, link, code }) =>
      `## ${heading}\n\n**${content}**\n\n[${link}](https://example.com)\n\n\`${code}\``
  )
);

/** Generate a slug-like string */
const arbSlug = fc
  .array(
    fc.string({ minLength: 1, maxLength: 10, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789') }),
    { minLength: 1, maxLength: 4 }
  )
  .map((parts) => parts.join('-'));

/** Generate an answer object */
const arbAnswer: fc.Arbitrary<QnaAnswer> = fc.record({
  body: arbMarkdownBody,
  isApprovedByAsker: fc.boolean(),
  upvotes: fc.integer({ min: 0, max: 1000 }),
});

/** Generate a Q&A question with optional answers */
const arbQuestion: fc.Arbitrary<QnaQuestion> = fc.record({
  title: arbTitle,
  body: arbMarkdownBody,
  slug: arbSlug,
  answers: fc.oneof(
    fc.constant(undefined),
    fc.constant([] as QnaAnswer[]),
    fc.array(arbAnswer, { minLength: 1, maxLength: 10 })
  ),
});

describe('Feature: synapse-mega-upgrade, Property 1: SEO Metadata Generation', () => {
  /**
   * Validates: Requirements 1.2
   *
   * Property: For any Q&A question with a non-empty body, the generated metadata
   * SHALL produce a title matching "{question.title} - Synapse Q&A".
   */
  it('title matches "{question.title} - Synapse Q&A" for any question', () => {
    fc.assert(
      fc.property(arbQuestion, (question) => {
        const metadata = generateQnaMetadata(question);
        expect(metadata.title).toBe(`${question.title} - Synapse Q&A`);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.2
   *
   * Property: For any Q&A question, the generated description SHALL be at most
   * 160 characters long.
   */
  it('description is at most 160 characters for any question', () => {
    fc.assert(
      fc.property(arbQuestion, (question) => {
        const metadata = generateQnaMetadata(question);
        expect(metadata.description.length).toBeLessThanOrEqual(160);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.2
   *
   * Property: When a question has an approved answer, the description SHALL be
   * derived from the approved answer's body (not the question body).
   */
  it('description is derived from the approved answer body when one exists', () => {
    const arbQuestionWithApproved = fc.record({
      title: arbTitle,
      body: arbMarkdownBody,
      slug: arbSlug,
      answers: fc
        .array(arbAnswer, { minLength: 1, maxLength: 5 })
        .chain((answers) => {
          // Ensure at least one approved answer exists
          const approvedAnswer: fc.Arbitrary<QnaAnswer> = fc.record({
            body: arbMarkdownBody,
            isApprovedByAsker: fc.constant(true),
            upvotes: fc.integer({ min: 0, max: 100 }),
          });
          return approvedAnswer.map((approved) => [approved, ...answers]);
        }),
    });

    fc.assert(
      fc.property(arbQuestionWithApproved, (question) => {
        const metadata = generateQnaMetadata(question);
        // The approved answer's body (stripped) should be the source
        const approvedAnswer = question.answers!.find((a) => a.isApprovedByAsker)!;
        const expectedSource = stripMarkdown(approvedAnswer.body).slice(0, 160);
        expect(metadata.description).toBe(expectedSource);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.2
   *
   * Property: When a question has no answers (or no approved answers),
   * the description SHALL be derived from the question body.
   */
  it('description is derived from question body when no approved answer exists', () => {
    const arbQuestionNoApproved = fc.record({
      title: arbTitle,
      body: arbMarkdownBody,
      slug: arbSlug,
      answers: fc.oneof(
        fc.constant(undefined),
        fc.constant([] as QnaAnswer[]),
        // All answers are NOT approved
        fc.array(
          fc.record({
            body: arbMarkdownBody,
            isApprovedByAsker: fc.constant(false),
            upvotes: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        )
      ),
    });

    fc.assert(
      fc.property(arbQuestionNoApproved, (question) => {
        const metadata = generateQnaMetadata(question);
        const expectedSource = stripMarkdown(question.body).slice(0, 160);
        expect(metadata.description).toBe(expectedSource);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.2
   *
   * Property: The openGraph properties SHALL always be valid: type is "article",
   * siteName is "Synapse", title and description match the top-level metadata,
   * and url matches "/qna/{slug}".
   */
  it('openGraph properties are valid for any question', () => {
    fc.assert(
      fc.property(arbQuestion, (question) => {
        const metadata = generateQnaMetadata(question);

        // openGraph title matches top-level title
        expect(metadata.openGraph.title).toBe(metadata.title);
        // openGraph description matches top-level description
        expect(metadata.openGraph.description).toBe(metadata.description);
        // type is always "article"
        expect(metadata.openGraph.type).toBe('article');
        // siteName is always "Synapse"
        expect(metadata.openGraph.siteName).toBe('Synapse');
        // url matches the slug
        expect(metadata.openGraph.url).toBe(`/qna/${question.slug}`);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.2
   *
   * Property: stripMarkdown SHALL produce output that contains no markdown
   * syntax characters for standard markdown patterns (headings, bold, links,
   * code blocks, images).
   */
  it('stripMarkdown removes all standard markdown syntax', () => {
    // Generate single alphanumeric words (no spaces) that won't be confused with markdown
    const arbWord = fc
      .string({ minLength: 3, maxLength: 15, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz') })
      .filter((s) => s.length >= 3);

    fc.assert(
      fc.property(
        fc.record({
          heading: arbWord,
          boldText: arbWord,
          linkText: arbWord,
          codeContent: arbWord,
        }),
        ({ heading, boldText, linkText, codeContent }) => {
          const markdown = `## ${heading}\n\n**${boldText}**\n\n[${linkText}](https://example.com)\n\n\`${codeContent}\``;
          const result = stripMarkdown(markdown);

          // Result should contain the text content (headings, bold text, link text preserved)
          expect(result).toContain(heading);
          expect(result).toContain(boldText);
          expect(result).toContain(linkText);
          // No markdown heading markers
          expect(result).not.toMatch(/^#{1,6}\s/m);
          // No markdown link syntax
          expect(result).not.toContain('](');
          // No inline code backticks
          expect(result).not.toContain('`');
        }
      ),
      { numRuns: 100 }
    );
  });
});
