import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Helper fetch yang otomatis menyisipkan JWT token dari Supabase Auth.
 * Semua service harus menggunakan fungsi ini, bukan fetch langsung.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Terjadi kesalahan server.' }));

    // Rate limit exceeded — beri pesan yang jelas ke user
    if (response.status === 429) {
      const limitMsg = error.message
        ?? `Batas penggunaan tercapai (${error.used ?? '?'}/${error.limit ?? '?'} per hari). Coba lagi besok atau upgrade paket Anda.`;
      throw new Error(limitMsg);
    }

    throw new Error(error.message ?? `HTTP Error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) return null as T;

  // Handle empty body gracefully
  const text = await response.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null as T;
  }
}

/**
 * Helper khusus untuk upload file (multipart/form-data).
 * Tidak menyertakan Content-Type agar browser bisa set boundary secara otomatis.
 */
export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload gagal.' }));

    if (response.status === 429) {
      const limitMsg = error.message
        ?? `Batas penggunaan tercapai (${error.used ?? '?'}/${error.limit ?? '?'} per hari). Coba lagi besok atau upgrade paket Anda.`;
      throw new Error(limitMsg);
    }

    throw new Error(error.message ?? `HTTP Error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
