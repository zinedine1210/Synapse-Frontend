import { apiFetch } from '@/lib/api';

export interface ForumAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes?: number;
  createdAt: string;
  uploaderName?: string;
}

export interface ForumPollOption {
  id: string;
  label: string;
  voteCount: number;
}

export interface ForumPoll {
  id: string;
  question: string;
  multiple: boolean;
  options: ForumPollOption[];
  userVotes: string[]; // option IDs user voted for
}

export interface ForumReminder {
  id: string;
  remindAt: string;
  sent: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT' | 'POLL' | 'REMINDER';
  isPinned: boolean;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  replyCount: number;
  voteScore: number;
  userVote: number;
  createdAt: string;
  attachments?: ForumAttachment[];
  poll?: ForumPoll;
  reminder?: ForumReminder;
}

export interface ForumReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  voteScore: number;
  userVote: number;
  createdAt: string;
}

export interface ForumPostDetail extends Omit<ForumPost, 'replyCount'> {
  replies: ForumReply[];
}

export interface ForumDiscussion {
  id: string;
  title: string;
  description?: string;
  isDefault?: boolean;
  taskId?: string;
  task?: { id: string; title: string; assignType: string; groupName?: string };
  sessionId?: string;
  session?: { id: string; title: string; sequence: number };
  assignType?: string;
  assignedUserIds?: string[];
  assignedGroupId?: string;
  authorId: string;
  authorName: string;
  postCount: number;
  createdAt: string;
}

export const forumService = {
  getClassPosts: (classId: string, discussionId?: string | null) => {
    const params = new URLSearchParams();
    if (discussionId) params.set('discussionId', discussionId);
    const qs = params.toString();
    return apiFetch<ForumPost[]>(`/forum/class/${classId}${qs ? `?${qs}` : ''}`);
  },

  createPost: (classId: string, data: {
    title?: string; content: string; category?: string; discussionId?: string;
    pollOptions?: string[]; pollMultiple?: boolean; remindAt?: string;
  }) =>
    apiFetch<ForumPost>(`/forum/class/${classId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPostDetail: (postId: string) =>
    apiFetch<ForumPostDetail>(`/forum/post/${postId}`),

  replyToPost: (postId: string, content: string) =>
    apiFetch<ForumReply>(`/forum/post/${postId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  vote: (data: { postId?: string; replyId?: string; value: number }) =>
    apiFetch<{ voteValue: number }>('/forum/vote', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePost: (postId: string) =>
    apiFetch<{ message: string }>(`/forum/post/${postId}`, { method: 'DELETE' }),

  deleteReply: (replyId: string) =>
    apiFetch<{ message: string }>(`/forum/reply/${replyId}`, { method: 'DELETE' }),

  togglePin: (postId: string) =>
    apiFetch<{ isPinned: boolean }>(`/forum/post/${postId}/pin`, { method: 'PATCH' }),

  votePoll: (optionId: string) =>
    apiFetch<{ voted: boolean; optionId: string }>(`/forum/poll/vote/${optionId}`, { method: 'POST' }),

  getClassAttachments: (classId: string) =>
    apiFetch<ForumAttachment[]>(`/forum/attachments/class/${classId}`),

  addAttachment: (data: { postId?: string; replyId?: string; fileName: string; fileUrl: string; fileType: string; fileSizeBytes?: number }) =>
    apiFetch<ForumAttachment>('/forum/attachment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Discussions (Pembahasan) ───────────────────────────────────────
  getClassDiscussions: (classId: string) =>
    apiFetch<ForumDiscussion[]>(`/forum/discussions/class/${classId}`),

  createDiscussion: (classId: string, data: { title: string; description?: string; taskId?: string; sessionId?: string; assignType?: string; assignedUserIds?: string[]; assignedGroupId?: string }) =>
    apiFetch<ForumDiscussion>(`/forum/discussions/class/${classId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDiscussion: (discussionId: string, data: { title?: string; description?: string; assignType?: string; assignedUserIds?: string[]; assignedGroupId?: string }) =>
    apiFetch<ForumDiscussion>(`/forum/discussions/${discussionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteDiscussion: (discussionId: string) =>
    apiFetch<{ message: string }>(`/forum/discussions/${discussionId}`, { method: 'DELETE' }),

  uploadFile: async (classId: string, file: File): Promise<{ fileUrl: string; fileName: string; fileType: string; fileSizeBytes: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forum/upload/${classId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await import('@/lib/supabase').then(m => m.supabase.auth.getSession())).data.session?.access_token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Upload gagal');
    }
    return res.json();
  },

  /** Mark a discussion as read */
  markAsRead: (classId: string, discussionId?: string | null) =>
    apiFetch<{ success: boolean }>(`/forum/read/${classId}`, {
      method: 'POST',
      body: JSON.stringify({ discussionId: discussionId ?? null }),
    }),

  /** Get unread counts per discussion */
  getUnreadCounts: (classId: string) =>
    apiFetch<Record<string, number>>(`/forum/unread/${classId}`),
};
