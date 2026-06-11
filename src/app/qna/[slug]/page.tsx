import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QnaPublicView } from './QnaPublicView';
import { stripMarkdown } from '@/lib/qna-metadata';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function getQuestion(slug: string) {
  try {
    const res = await fetch(`${API_URL}/qna/questions/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const question = await getQuestion(params.slug);
  if (!question) {
    return { title: 'Pertanyaan tidak ditemukan - Synapse Q&A' };
  }

  // Derive description: best (approved) answer body → question body → fallback
  const bestAnswerBody = question.answers?.find((a: any) => a.isApprovedByAsker)?.body;
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

export default async function QnaDetailPage({ params }: { params: { slug: string } }) {
  const question = await getQuestion(params.slug);

  if (!question) {
    notFound();
  }

  // The backend response includes relatedQuestions (up to 5) — pass them as SSR data
  const relatedQuestions = question.relatedQuestions ?? [];

  return <QnaPublicView question={question} relatedQuestions={relatedQuestions} />;
}
