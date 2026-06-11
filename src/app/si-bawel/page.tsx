'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SiBawelRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/duit-tracker'); }, [router]);
  return null;
}
