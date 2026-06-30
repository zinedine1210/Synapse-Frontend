import { apiFetch, apiUpload } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────

export interface ThesisFormatTemplate {
  id: string;
  thesisId: string;
  universityName?: string;
  formatRules: string; // JSON
  chapterTemplate?: string; // JSON
  citationStyle: string;
  customCitation?: string;
  language: string;
  rawUploadText?: string;
}

export interface ThesisChapter {
  id: string;
  thesisId: string;
  title: string;
  chapterNum: number;
  status: string;
  content?: string;
  wordCount: number;
  targetWords?: number;
  targetPages?: number;
  targetParagraphs?: number;
  paragraphCount: number;
  pageEstimate: number;
  notes?: string;
  aiSuggestion?: string;
  sortOrder: number;
  revisions?: ChapterRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface ChapterRevision {
  id: string;
  chapterId: string;
  thesisId: string;
  note: string;
  status: string; // pending | resolved
  round: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterVersionMeta {
  id: string;
  wordCount: number;
  label?: string;
  createdAt: string;
}

export interface ChapterVersionFull extends ChapterVersionMeta {
  chapterId: string;
  content: string;
}

export interface ThesisJournal {
  id: string;
  thesisId: string;
  title: string;
  authors?: string;
  journalName?: string;
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  relevance?: string;
  notes?: string;
  isFromSearch: boolean;
  bibtex?: string;
  citationKey?: string;
  addedAt: string;
}

export interface ThesisBimbingan {
  id: string;
  thesisId: string;
  date: string;
  supervisor?: string;
  topic: string;
  feedback?: string;
  actionItems?: string; // JSON
  status: string;
  attachment?: string;
  createdAt: string;
}

export interface ThesisChatMessage {
  id: string;
  thesisId: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string;
  createdAt: string;
}

export interface ThesisBibliography {
  id: string;
  thesisId: string;
  journalId?: string;
  rawEntry: string;
  citationKey: string;
  entryType: string;
  sortOrder: number;
}

export interface ThesisProject {
  id: string;
  userId: string;
  title: string;
  university?: string;
  faculty?: string;
  department?: string;
  supervisor?: string;
  supervisorTwo?: string;
  status: string;
  startDate?: string;
  targetDate?: string;
  abstract?: string;
  notes?: string;
  isPublished: boolean;
  publishedAt?: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  formatTemplate?: ThesisFormatTemplate;
  chapters: ThesisChapter[];
  journals?: ThesisJournal[];
  bimbingans?: ThesisBimbingan[];
  bibliographies?: ThesisBibliography[];
  _count?: { journals: number; bimbingans: number; chatMessages: number; likes?: number; comments?: number; bookmarks?: number; chapters?: number };
  user?: { id: string; fullName: string; avatarUrl?: string };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface ThesisProgress {
  overallProgress: number;
  totalChapters: number;
  doneChapters: number;
  totalWords: number;
  targetWords: number;
  totalBimbingan: number;
  doneBimbingan: number;
  pendingActions: string[];
  totalJournals: number;
  chapterProgress: {
    id: string;
    title: string;
    chapterNum: number;
    status: string;
    wordCount: number;
    targetWords?: number;
    progress: number;
  }[];
  daysElapsed: number;
  daysRemaining: number | null;
}

export interface JournalSearchResult {
  title: string;
  authors: string;
  year?: number;
  abstract?: string;
  doi?: string;
  url?: string;
  journalName?: string;
  citationCount?: number;
}

export interface RelevanceMatrixItem {
  title: string;
  theme: string;
  methodology: string;
  findings: string;
  relevanceToThesis: string;
  gap: string;
  score: number;
}

export interface ThesisComment {
  id: string;
  userId: string;
  thesisId: string;
  content: string;
  createdAt: string;
  user?: { id: string; fullName: string; avatarUrl?: string };
}

export interface ExploreResult {
  items: (ThesisProject & { isLiked: boolean; isBookmarked: boolean })[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PublicThesisDetail extends ThesisProject {
  isLiked: boolean;
  isBookmarked: boolean;
  comments: ThesisComment[];
}

// ─── Service ──────────────────────────────────────────────────

export const skripsweetService = {
  // Thesis CRUD
  create: (data: Partial<ThesisProject>) =>
    apiFetch<ThesisProject>('/skripsweet', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () =>
    apiFetch<ThesisProject[]>('/skripsweet'),

  getDetail: (id: string) =>
    apiFetch<ThesisProject>(`/skripsweet/${id}`),

  update: (id: string, data: Partial<ThesisProject>) =>
    apiFetch<ThesisProject>(`/skripsweet/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/${id}`, { method: 'DELETE' }),

  // Format Template
  setFormat: (id: string, data: Partial<ThesisFormatTemplate>) =>
    apiFetch<ThesisFormatTemplate>(`/skripsweet/${id}/format`, { method: 'PATCH', body: JSON.stringify(data) }),

  explainFormat: (id: string, explanation: string) =>
    apiFetch<{ template: ThesisFormatTemplate; chapters?: any[] }>(`/skripsweet/${id}/format/explain`, {
      method: 'POST', body: JSON.stringify({ explanation }),
    }),

  uploadFormatFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<{ template: ThesisFormatTemplate; chapters?: any[] }>(`/skripsweet/${id}/format/upload`, formData);
  },

  // Chapters
  createChapter: (thesisId: string, data: Partial<ThesisChapter>) =>
    apiFetch<ThesisChapter>(`/skripsweet/${thesisId}/chapters`, { method: 'POST', body: JSON.stringify(data) }),

  updateChapter: (thesisId: string, chapterId: string, data: Partial<ThesisChapter>) =>
    apiFetch<ThesisChapter>(`/skripsweet/${thesisId}/chapters/${chapterId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteChapter: (thesisId: string, chapterId: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/${thesisId}/chapters/${chapterId}`, { method: 'DELETE' }),

  reorderChapters: (thesisId: string, chapterIds: string[]) =>
    apiFetch<{ reordered: boolean }>(`/skripsweet/${thesisId}/chapters/reorder`, { method: 'POST', body: JSON.stringify({ chapterIds }) }),

  getChapterFeedback: (thesisId: string, chapterId: string) =>
    apiFetch<{ feedback: string }>(`/skripsweet/${thesisId}/chapters/${chapterId}/feedback`, { method: 'POST' }),

  // Chapter Revisions
  addRevision: (thesisId: string, chapterId: string, note: string, round?: number) =>
    apiFetch<ChapterRevision>(`/skripsweet/${thesisId}/chapters/${chapterId}/revisions`, { method: 'POST', body: JSON.stringify({ note, round }) }),

  resolveRevision: (thesisId: string, chapterId: string, revisionId: string) =>
    apiFetch<ChapterRevision>(`/skripsweet/${thesisId}/chapters/${chapterId}/revisions/${revisionId}/resolve`, { method: 'PATCH' }),

  unresolveRevision: (thesisId: string, chapterId: string, revisionId: string) =>
    apiFetch<ChapterRevision>(`/skripsweet/${thesisId}/chapters/${chapterId}/revisions/${revisionId}/unresolve`, { method: 'PATCH' }),

  deleteRevision: (thesisId: string, chapterId: string, revisionId: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/${thesisId}/chapters/${chapterId}/revisions/${revisionId}`, { method: 'DELETE' }),

  // Chapter Versions
  getChapterVersions: (thesisId: string, chapterId: string) =>
    apiFetch<ChapterVersionMeta[]>(`/skripsweet/${thesisId}/chapters/${chapterId}/versions`),

  getChapterVersion: (thesisId: string, chapterId: string, versionId: string) =>
    apiFetch<ChapterVersionFull>(`/skripsweet/${thesisId}/chapters/${chapterId}/versions/${versionId}`),

  saveChapterVersion: (thesisId: string, chapterId: string, label?: string) =>
    apiFetch<ChapterVersionFull>(`/skripsweet/${thesisId}/chapters/${chapterId}/versions/save`, { method: 'POST', body: JSON.stringify({ label }) }),

  restoreChapterVersion: (thesisId: string, chapterId: string, versionId: string) =>
    apiFetch<ThesisChapter>(`/skripsweet/${thesisId}/chapters/${chapterId}/versions/${versionId}/restore`, { method: 'POST' }),

  deleteChapterVersion: (thesisId: string, chapterId: string, versionId: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/${thesisId}/chapters/${chapterId}/versions/${versionId}`, { method: 'DELETE' }),

  updateChapterVersionLabel: (thesisId: string, chapterId: string, versionId: string, label: string) =>
    apiFetch<ChapterVersionFull>(`/skripsweet/${thesisId}/chapters/${chapterId}/versions/${versionId}`, { method: 'PATCH', body: JSON.stringify({ label }) }),

  // Journals
  addJournal: (thesisId: string, data: Partial<ThesisJournal>) =>
    apiFetch<ThesisJournal>(`/skripsweet/${thesisId}/journals`, { method: 'POST', body: JSON.stringify(data) }),

  removeJournal: (thesisId: string, journalId: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/${thesisId}/journals/${journalId}`, { method: 'DELETE' }),

  updateJournal: (thesisId: string, journalId: string, data: Partial<ThesisJournal>) =>
    apiFetch<ThesisJournal>(`/skripsweet/${thesisId}/journals/${journalId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  searchJournals: (thesisId: string, query: string, limit?: number) =>
    apiFetch<{ results: JournalSearchResult[]; source: string }>(`/skripsweet/${thesisId}/journals/search`, {
      method: 'POST', body: JSON.stringify({ query, limit }),
    }),

  getRelevanceMatrix: (thesisId: string) =>
    apiFetch<{ matrix: RelevanceMatrixItem[] }>(`/skripsweet/${thesisId}/journals/matrix`),

  // Bimbingan
  createBimbingan: (thesisId: string, data: any) =>
    apiFetch<ThesisBimbingan>(`/skripsweet/${thesisId}/bimbingan`, { method: 'POST', body: JSON.stringify(data) }),

  updateBimbingan: (thesisId: string, bimbinganId: string, data: any) =>
    apiFetch<ThesisBimbingan>(`/skripsweet/${thesisId}/bimbingan/${bimbinganId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteBimbingan: (thesisId: string, bimbinganId: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/${thesisId}/bimbingan/${bimbinganId}`, { method: 'DELETE' }),

  uploadBimbinganAttachment: (thesisId: string, bimbinganId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<ThesisBimbingan>(`/skripsweet/${thesisId}/bimbingan/${bimbinganId}/upload`, formData);
  },

  // Chat AI
  chat: (thesisId: string, message: string, context?: string) =>
    apiFetch<{ response: string }>(`/skripsweet/${thesisId}/chat`, {
      method: 'POST', body: JSON.stringify({ message, context }),
    }),

  getChatHistory: (thesisId: string, page?: number) =>
    apiFetch<ThesisChatMessage[]>(`/skripsweet/${thesisId}/chat/history${page ? `?page=${page}` : ''}`),

  clearChatHistory: (thesisId: string) =>
    apiFetch<{ cleared: boolean }>(`/skripsweet/${thesisId}/chat/history`, { method: 'DELETE' }),

  // AI Writing Assist
  aiWriteAssist: (thesisId: string, chapterId: string, action: string, selectedText?: string, customPrompt?: string) =>
    apiFetch<{ content: string; action: string }>(`/skripsweet/${thesisId}/chapters/${chapterId}/ai-assist`, {
      method: 'POST', body: JSON.stringify({ action, selectedText, customPrompt }),
    }),

  // Bibliography
  generateBibliography: (thesisId: string, style?: string) =>
    apiFetch<{ bibliography: any[]; style: string }>(`/skripsweet/${thesisId}/bibliography/generate`, {
      method: 'POST', body: JSON.stringify({ style }),
    }),

  addBibliographyEntry: (thesisId: string, data: any) =>
    apiFetch<ThesisBibliography>(`/skripsweet/${thesisId}/bibliography`, { method: 'POST', body: JSON.stringify(data) }),

  deleteBibliographyEntry: (thesisId: string, entryId: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/${thesisId}/bibliography/${entryId}`, { method: 'DELETE' }),

  // Progress
  getProgress: (thesisId: string) =>
    apiFetch<ThesisProgress>(`/skripsweet/${thesisId}/progress`),

  // Export
  exportThesis: (thesisId: string) =>
    apiFetch<{ html: string; filename: string; title: string; chapterCount: number; totalWords: number }>(`/skripsweet/${thesisId}/export`),

  // Social / Community
  publish: (thesisId: string, tags: string[]) =>
    apiFetch<ThesisProject>(`/skripsweet/${thesisId}/publish`, { method: 'POST', body: JSON.stringify({ tags }) }),

  unpublish: (thesisId: string) =>
    apiFetch<ThesisProject>(`/skripsweet/${thesisId}/unpublish`, { method: 'POST' }),

  explore: (params?: { q?: string; tag?: string; university?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.tag) q.set('tag', params.tag);
    if (params?.university) q.set('university', params.university);
    if (params?.page) q.set('page', String(params.page));
    return apiFetch<ExploreResult>(`/skripsweet/community/explore?${q.toString()}`);
  },

  getTrendingTags: () =>
    apiFetch<{ tag: string; count: number }[]>('/skripsweet/community/trending-tags'),

  getMyBookmarks: () =>
    apiFetch<ThesisProject[]>('/skripsweet/community/bookmarks'),

  getPublicThesis: (id: string) =>
    apiFetch<PublicThesisDetail>(`/skripsweet/community/${id}`),

  toggleLike: (thesisId: string) =>
    apiFetch<{ liked: boolean }>(`/skripsweet/${thesisId}/like`, { method: 'POST' }),

  toggleBookmark: (thesisId: string) =>
    apiFetch<{ bookmarked: boolean }>(`/skripsweet/${thesisId}/bookmark`, { method: 'POST' }),

  addComment: (thesisId: string, content: string) =>
    apiFetch<ThesisComment>(`/skripsweet/${thesisId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  deleteComment: (commentId: string) =>
    apiFetch<{ deleted: boolean }>(`/skripsweet/comments/${commentId}`, { method: 'DELETE' }),
};
