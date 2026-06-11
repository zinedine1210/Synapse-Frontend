import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { QnaPublicView } from './QnaPublicView';

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

  const description = question.answers?.find((a: any) => a.isApprovedByAsker)?.body?.slice(0, 160)
    || question.body?.slice(0, 160)
    || `Lihat jawaban untuk: ${question.title}`;

  return {
    title: `${question.title} - Synapse Q&A`,
    description,
    openGraph: {
      title: `${question.title} - Synapse Q&A`,
      description,
      type: 'article',
      siteName: 'Synapse',
    },
  };
}

export default async function QnaDetailPage({ params }: { params: { slug: string } }) {
  const question = await getQuestion(params.slug);

  if (!question) {
    notFound();
  }

  return <QnaPublicView question={question} />;
}
