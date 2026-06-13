'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { forumService, ForumPost, ForumReply, ForumAttachment, ForumDiscussion } from '@/services/forumService';
import { classService, CustomTab, CustomTabFile } from '@/services/classService';
import { groupService } from '@/services/groupService';
import { Button, Modal, useToast, useConfirm, TextInput, SelectOption, DatePicker, TimePicker, TextArea } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Send, Pin, Trash2, Loader2, HelpCircle, Megaphone, MessagesSquare,
  MoreVertical, Reply, X, BarChart3,
  Bell, Paperclip, Plus, Search,
  Hash, Users as UsersIcon, ChevronUp, ImageIcon, FileText, Download, Pencil,
  ChevronLeft, Bookmark, Save, ChevronDown, Calendar, StickyNote, MoreHorizontal,
  Upload, ArrowDown,
} from 'lucide-react';

interface ForumTabProps {
  classId: string;
  userId: string;
  memberRole?: string;
  permissions?: string[];
  sessions?: { id: string; title: string; sequence: number }[];
  tasks?: { id: string; title: string }[];
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  DISCUSSION: { label: 'Diskusi', color: 'rgb(var(--color-primary))', bg: 'rgba(var(--color-primary) / 0.06)', icon: MessagesSquare },
  QUESTION: { label: 'Pertanyaan', color: 'rgb(var(--color-warning))', bg: 'rgba(var(--color-warning) / 0.06)', icon: HelpCircle },
  ANNOUNCEMENT: { label: 'Pengumuman', color: 'rgb(var(--color-secondary))', bg: 'rgba(var(--color-secondary) / 0.06)', icon: Megaphone },
  POLL: { label: 'Voting', color: 'rgb(var(--color-info, var(--color-primary)))', bg: 'rgba(var(--color-primary) / 0.06)', icon: BarChart3 },
  REMINDER: { label: 'Pengingat', color: 'rgb(var(--color-warning))', bg: 'rgba(var(--color-warning) / 0.06)', icon: Bell },
};

// 16 distinct gradient pairs for member avatars — enough to avoid collision in typical class sizes
const MEMBER_COLORS: [string, string][] = [
  ['#667eea', '#764ba2'], // indigo–purple
  ['#f093fb', '#f5576c'], // pink–red
  ['#4facfe', '#00f2fe'], // sky–cyan
  ['#43e97b', '#38f9d7'], // green–teal
  ['#fa709a', '#fee140'], // rose–yellow
  ['#a18cd1', '#fbc2eb'], // lavender–pink
  ['#ff9a9e', '#fad0c4'], // salmon–peach
  ['#89f7fe', '#66a6ff'], // aqua–blue
  ['#fbc2eb', '#a6c1ee'], // blush–periwinkle
  ['#f6d365', '#fda085'], // gold–coral
  ['#84fab0', '#8fd3f4'], // mint–sky
  ['#cfd9df', '#e2ebf0'], // silver–ice  (light but distinct)
  ['#a1c4fd', '#c2e9fb'], // pastel blue
  ['#d4fc79', '#96e6a1'], // lime–green
  ['#e0c3fc', '#8ec5fc'], // mauve–blue
  ['#f5576c', '#ff9966'], // red–orange
];

const getMemberColor = (authorId: string): [string, string] => {
  // Deterministic hash from authorId for stable color assignment
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = ((hash << 5) - hash + authorId.charCodeAt(i)) | 0;
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
};

const linkifyContent = (text: string): React.ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s<]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--color-primary))', textDecoration: 'underline', wordBreak: 'break-all' }}>{part.length > 60 ? part.slice(0, 57) + '...' : part}</a>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
};

const parseContent = (
  text: string,
  sessions?: { id: string; title: string; sequence: number }[],
  onNavigate?: (tab: string, params?: Record<string, string>) => void,
  classMembers?: any[],
  onMemberClick?: (member: any) => void,
  tasks?: { id: string; title: string }[],
): React.ReactNode[] => {
  if (!text) return [];
  const tagRegex = /@([a-zA-Z0-9_\-]+)/gi;
  const parts = text.split(tagRegex);
  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) result.push(...linkifyContent(parts[i]));
    } else {
      const tagContent = parts[i];
      const lowerTag = tagContent.toLowerCase();

      if (lowerTag.startsWith('pertemuan-')) {
        const ref = tagContent.split('-')[1];
        const sess = sessions?.find((s) => s.sequence.toString() === ref);
        result.push(
          <span key={`tag-${i}`} onClick={() => onNavigate?.('pertemuan')} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--font-xs)' }}>
            @{tagContent}{sess ? ` ${sess.title}` : ''}
          </span>
        );
      } else if (lowerTag.startsWith('tugas-')) {
        const taskSlug = lowerTag.replace('tugas-', '');
        const matchedTask = tasks?.find(t => t.title.replace(/\s+/g, '-').toLowerCase() === taskSlug);
        result.push(
          <span key={`tag-${i}`} onClick={() => onNavigate?.('tugas', matchedTask ? { taskId: matchedTask.id } : undefined)} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--font-xs)' }}>
            @{tagContent}
          </span>
        );
      } else {
        const member = classMembers?.find(
          (m) => m.user.fullName.replace(/\s+/g, '').toLowerCase() === lowerTag
        );
        if (member) {
          result.push(
            <span key={`tag-${i}`} onClick={() => onMemberClick?.(member)} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'rgb(99, 102, 241)', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-xs)' }}>
              @{member.user.fullName}
            </span>
          );
        } else {
          result.push(<React.Fragment key={`tag-${i}`}>@{tagContent}</React.Fragment>);
        }
      }
    }
  }
  return result.length ? result : linkifyContent(text);
};

export function ForumTab({ classId, userId, memberRole, permissions, sessions, tasks, onNavigate }: ForumTabProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { hasFeature } = useFeatureAccess();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const hasPerm = (perm: string) => memberRole === 'OWNER' || (permissions || []).includes(perm);
  const canDiscussion = hasPerm('FORUM_DISCUSSION') && hasFeature('forum_discussion');
  const canCanvas = hasPerm('CANVAS_MANAGE') && hasFeature('canvas');
  const canAnnouncement = hasPerm('FORUM_ANNOUNCEMENT') && hasFeature('forum_announcement');
  const canReminder = hasPerm('FORUM_REMINDER') && hasFeature('forum_reminder');
  const canPoll = hasPerm('FORUM_POLL') && hasFeature('forum_poll');
  const canPin = hasPerm('FORUM_PIN');
  const canDelete = hasPerm('FORUM_DELETE');

  // Discussions sidebar
  const [discussions, setDiscussions] = useState<ForumDiscussion[]>([]);
  const [activeDiscussionId, setActiveDiscussionId] = useState<string | null>(null);
  const [showCreateDiscussion, setShowCreateDiscussion] = useState(false);
  const [newDiscTitle, setNewDiscTitle] = useState('');
  const [newDiscDesc, setNewDiscDesc] = useState('');
  const [newDiscContext, setNewDiscContext] = useState<'general' | 'task' | 'session'>('general');
  const [newDiscTaskId, setNewDiscTaskId] = useState('');
  const [newDiscSessionId, setNewDiscSessionId] = useState('');
  const [isCreatingDisc, setIsCreatingDisc] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [discSearch, setDiscSearch] = useState('');
  const [discMenuId, setDiscMenuId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Mobile responsive: detect viewport and use WhatsApp-style navigation
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    // On mobile, start with sidebar open (discussion list view)
    if (mq.matches) setSidebarOpen(true);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSidebarOpen(true); // reset on desktop
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Hide bottom nav when in chat mode on mobile (prevents input overlap)
  useEffect(() => {
    const inChat = isMobile && !sidebarOpen;
    document.body.classList.toggle('hide-bottom-nav', inChat);
    return () => { document.body.classList.remove('hide-bottom-nav'); };
  }, [isMobile, sidebarOpen]);

  // On mobile, selecting a discussion closes sidebar to show chat
  const handleSelectDiscussion = useCallback((discId: string | null) => {
    setActiveDiscussionId(discId);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // On mobile, back button shows sidebar again
  const handleMobileBack = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  // Discussion assignment state
  const [discAssignType, setDiscAssignType] = useState<'ALL' | 'INDIVIDUAL' | 'GROUP'>('ALL');
  const [discAssignedUserIds, setDiscAssignedUserIds] = useState<string[]>([]);
  const [discAssignedGroupId, setDiscAssignedGroupId] = useState('');
  const [discGroups, setDiscGroups] = useState<any[]>([]);

  // Edit discussion state
  const [editingDiscussion, setEditingDiscussion] = useState<ForumDiscussion | null>(null);
  const [editDiscTitle, setEditDiscTitle] = useState('');
  const [editDiscDesc, setEditDiscDesc] = useState('');
  const [editDiscAssignType, setEditDiscAssignType] = useState<'ALL' | 'INDIVIDUAL' | 'GROUP'>('ALL');
  const [editDiscAssignedUserIds, setEditDiscAssignedUserIds] = useState<string[]>([]);
  const [editDiscAssignedGroupId, setEditDiscAssignedGroupId] = useState('');
  const [isSavingDisc, setIsSavingDisc] = useState(false);

  // Posts & chat
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [classMembers, setClassMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  // Message input
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSentPostRef = useRef<string | null>(null);

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Pending attachment (staged in editor before send)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);

  // Special post modal
  const [showSpecialPost, setShowSpecialPost] = useState(false);
  const [specialCategory, setSpecialCategory] = useState<'ANNOUNCEMENT' | 'QUESTION' | 'POLL' | 'REMINDER'>('ANNOUNCEMENT');
  const [specialTitle, setSpecialTitle] = useState('');
  const [specialContent, setSpecialContent] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollMultiple, setPollMultiple] = useState(false);
  const [remindAt, setRemindAt] = useState('');
  const [reminderContext, setReminderContext] = useState<'general' | 'task' | 'session'>('general');
  const [reminderContextId, setReminderContextId] = useState('');
  const [isCreatingSpecial, setIsCreatingSpecial] = useState(false);

  // Context menu & reply
  const [contextMenu, setContextMenu] = useState<{ postId: string; x: number; y: number } | null>(null);
  const [replyToPost, setReplyToPost] = useState<{ id: string; authorName: string; content: string } | null>(null);

  // Chat search
  const [chatSearch, setChatSearch] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Discussion tabs (chat / lampiran / canvas IDs)
  const [discussionTab, setDiscussionTab] = useState<string>('chat');
  const [infoSendingFile, setInfoSendingFile] = useState(false);
  const infoFileInputRef = useRef<HTMLInputElement>(null);

  // Date jump
  const [dateJumpOpen, setDateJumpOpen] = useState(false);
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom button
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Custom tabs (Slack-like canvas)
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [showCreateTabModal, setShowCreateTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [creatingTab, setCreatingTab] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [tabMenuId, setTabMenuId] = useState<string | null>(null);
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasDirty, setCanvasDirty] = useState(false);
  const [savingTabContent, setSavingTabContent] = useState(false);
  const [uploadingTabFile, setUploadingTabFile] = useState(false);
  const tabFileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }), 50);
  }, []);

  const activeDiscussion = activeDiscussionId ? discussions.find(d => d.id === activeDiscussionId) : null;

  // Socket.IO
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const wsBase = apiUrl.replace(/\/api\/v\d+\/?$/, '');
    const socket = io(`${wsBase}/forum`, { transports: ['polling'], withCredentials: true });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('joinClass', { classId }));
    socket.on('newPost', (post: ForumPost & { discussionId?: string | null }) => {
      const postDiscId = post.discussionId || null;
      if (postDiscId !== activeDiscussionId) {
        // Increment unread count for non-active discussion
        if (post.authorId !== userId) {
          const key = postDiscId || '__umum__';
          setUnreadCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
        }
        return;
      }
      // Skip if this is our own post (already added optimistically)
      if (post.authorId === userId && lastSentPostRef.current) {
        // Replace temp post with real post from socket
        setPosts((prev) => {
          const hasTemp = prev.some(p => p.id.startsWith('temp-'));
          if (hasTemp) {
            return prev.map(p => p.id.startsWith('temp-') ? { ...post } : p);
          }
          // Already replaced by API response, skip duplicate
          if (prev.some(p => p.id === post.id)) return prev;
          return [...prev, post];
        });
        lastSentPostRef.current = null;
      } else {
        setPosts((prev) => prev.some(p => p.id === post.id) ? prev : [...prev, post]);
      }
      scrollToBottom();
    });
    socket.on('postDeleted', ({ postId }: { postId: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    });
    socket.on('pinToggled', ({ postId, isPinned }: { postId: string; isPinned: boolean }) => {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPinned } : p));
    });
    return () => { socket.emit('leaveClass', { classId }); socket.disconnect(); };
  }, [classId, scrollToBottom, activeDiscussionId]);

  // Fetch data
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await forumService.getClassPosts(classId, activeDiscussionId || undefined);
      setPosts((data || []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } catch { } finally { setLoading(false); }
  }, [classId, activeDiscussionId]);

  const fetchDiscussions = useCallback(async () => {
    try { const data = await forumService.getClassDiscussions(classId); setDiscussions(data || []); } catch { }
  }, [classId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => {
    fetchDiscussions();
    classService.getClassMembers(classId).then(setClassMembers).catch(() => {});
    groupService.getClassGroups(classId).then(setDiscGroups).catch(() => {});
    if (hasFeature('unread_tracking')) forumService.getUnreadCounts(classId).then(setUnreadCounts).catch(() => {});
  }, [classId, fetchDiscussions]);
  useEffect(() => {
    if (hasFeature('class_custom_tabs')) classService.getCustomTabs(classId, activeDiscussionId ?? null).then(setCustomTabs).catch(() => {});
  }, [classId, activeDiscussionId]);
  useEffect(() => { if (!loading && posts.length > 0) scrollToBottom(false); }, [loading]);
  useEffect(() => { setDiscussionTab('chat'); }, [activeDiscussionId]);

  // Mark discussion as read when switching
  useEffect(() => {
    forumService.markAsRead(classId, activeDiscussionId).catch(() => {});
    // Clear local unread count
    setUnreadCounts(prev => {
      const key = activeDiscussionId || '__umum__';
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [classId, activeDiscussionId]);

  // URL sync: push tab/discussion state to URL
  const updateUrl = useCallback((discTab: string, discId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    // Keep existing tab param (main class tab)
    if (discTab !== 'chat') {
      params.set('subtab', discTab);
    } else {
      params.delete('subtab');
    }
    if (discId) {
      params.set('discussion', discId);
    } else {
      params.delete('discussion');
    }
    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  // Restore state from URL on mount
  useEffect(() => {
    const urlDiscussion = searchParams.get('discussion');
    const urlSubtab = searchParams.get('subtab');
    if (urlDiscussion) setActiveDiscussionId(urlDiscussion);
    if (urlSubtab) setDiscussionTab(urlSubtab);
  }, []); // only on mount

  // Push state to URL on change
  useEffect(() => {
    updateUrl(discussionTab, activeDiscussionId);
  }, [discussionTab, activeDiscussionId]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 120);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loading, discussionTab]);

  // Active custom tab data (derived from discussionTab — if it's not 'chat' or 'lampiran', it's a canvas tab ID)
  const activeCustomTab = (discussionTab !== 'chat' && discussionTab !== 'lampiran')
    ? customTabs.find(t => t.id === discussionTab) || null
    : null;

  // Custom tab handlers
  const handleCreateTab = async () => {
    if (!newTabName.trim()) return;
    setCreatingTab(true);
    try {
      const tab = await classService.createCustomTab(classId, newTabName.trim(), activeDiscussionId ?? null);
      setCustomTabs(prev => [...prev, tab]);
      setShowCreateTabModal(false);
      setNewTabName('');
      setDiscussionTab(tab.id);
      showToast('Canvas berhasil dibuat.', 'success');
    } catch (e: any) { showToast(e?.message || 'Gagal membuat canvas.', 'error'); }
    finally { setCreatingTab(false); }
  };

  const handleRenameTab = async (tabId: string) => {
    if (!renameValue.trim()) return;
    try {
      const updated = await classService.updateCustomTab(tabId, { name: renameValue.trim() });
      setCustomTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: updated.name } : t));
      setRenamingTabId(null);
      showToast('Nama tab diubah.', 'success');
    } catch { showToast('Gagal mengubah nama.', 'error'); }
  };

  const handleDeleteTab = async (tabId: string) => {
    const ok = await confirm({ title: 'Hapus Canvas', message: 'Semua konten dan lampiran dalam canvas ini akan dihapus.', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await classService.deleteCustomTab(tabId);
      setCustomTabs(prev => prev.filter(t => t.id !== tabId));
      if (discussionTab === tabId) setDiscussionTab('chat');
      showToast('Canvas dihapus.', 'success');
    } catch { showToast('Gagal menghapus canvas.', 'error'); }
  };

  const handleSaveTabContent = async () => {
    if (!activeCustomTab) return;
    setSavingTabContent(true);
    try {
      const updated = await classService.updateCustomTab(activeCustomTab.id, { content: canvasContent });
      setCustomTabs(prev => prev.map(t => t.id === updated.id ? updated : t));
      setCanvasDirty(false);
      showToast('Konten tersimpan.', 'success');
    } catch { showToast('Gagal menyimpan.', 'error'); }
    finally { setSavingTabContent(false); }
  };

  // Sync canvasContent when switching tabs
  useEffect(() => {
    if (activeCustomTab) {
      setCanvasContent(activeCustomTab.content);
      setCanvasDirty(false);
    }
  }, [activeCustomTab?.id]);

  const handleCanvasChange = (html: string) => {
    setCanvasContent(html);
    setCanvasDirty(true);
    // Auto-save after 2s of inactivity
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!activeCustomTab) return;
      try {
        const updated = await classService.updateCustomTab(activeCustomTab.id, { content: html });
        setCustomTabs(prev => prev.map(t => t.id === updated.id ? updated : t));
        setCanvasDirty(false);
      } catch { /* silent auto-save fail */ }
    }, 2000);
  };

  const handleUploadTabFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCustomTab) return;
    if (file.size > 10 * 1024 * 1024) { showToast('Maks 10MB.', 'error'); return; }
    setUploadingTabFile(true);
    try {
      const uploaded = await classService.uploadCustomTabFile(activeCustomTab.id, file);
      setCustomTabs(prev => prev.map(t => t.id === activeCustomTab.id ? { ...t, files: [...t.files, uploaded] } : t));
      showToast('File diupload.', 'success');
    } catch { showToast('Gagal upload.', 'error'); }
    finally { setUploadingTabFile(false); if (tabFileInputRef.current) tabFileInputRef.current.value = ''; }
  };

  const handleDeleteTabFile = async (fileId: string) => {
    if (!activeCustomTab) return;
    const ok = await confirm({ message: 'Hapus file ini?', variant: 'danger' });
    if (!ok) return;
    try {
      await classService.deleteCustomTabFile(fileId);
      setCustomTabs(prev => prev.map(t => t.id === activeCustomTab.id ? { ...t, files: t.files.filter(f => f.id !== fileId) } : t));
      showToast('File dihapus.', 'success');
    } catch { showToast('Gagal menghapus.', 'error'); }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // @ Suggestions
  const handleInputChange = (val: string) => {
    setMessageText(val);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) { setShowSuggestions(true); setSuggestionFilter(atMatch[1]); }
    else { setShowSuggestions(false); }
  };

  const insertTag = (tag: string) => {
    const before = messageText.replace(/@\w*$/, '');
    setMessageText(before + tag + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const suggestions = useMemo(() => {
    const items: { label: string; tag: string }[] = [];
    if (sessions) sessions.forEach((s) => items.push({ label: `📚 ${s.title}`, tag: `@pertemuan-${s.sequence}` }));
    if (tasks && tasks.length > 0) tasks.forEach((t) => items.push({ label: `📋 ${t.title}`, tag: `@tugas-${t.title.replace(/\s+/g, '-').toLowerCase()}` }));
    if (classMembers) classMembers.forEach((m) => items.push({ label: `👤 ${m.user.fullName}`, tag: `@${m.user.fullName.replace(/\s+/g, '')}` }));
    return items.filter((i) => !suggestionFilter || i.label.toLowerCase().includes(suggestionFilter.toLowerCase()) || i.tag.toLowerCase().includes(suggestionFilter.toLowerCase()));
  }, [sessions, tasks, classMembers, suggestionFilter]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPendingAttachment = !!pendingFile;
    if (!messageText.trim() && !hasPendingAttachment) return;
    const text = messageText.trim();
    const fileToSend = pendingFile;
    const replyRef = replyToPost;
    setMessageText(''); setReplyToPost(null); setPendingFile(null); setPendingFilePreview(null); setIsSending(true);
    const msgContent = text || (fileToSend?.type.startsWith('image/') ? `📷 ${fileToSend.name}` : `📄 ${fileToSend?.name || 'Lampiran'}`);
    const fullContent = replyRef ? `[reply:${replyRef.id}:${replyRef.authorName}]\n${msgContent}` : msgContent;
    const tempId = `temp-${Date.now()}`;
    const optimisticPost: ForumPost = {
      id: tempId, title: msgContent.slice(0, 80), content: fullContent, category: 'DISCUSSION',
      isPinned: false, authorId: userId, authorName: 'Anda', replyCount: 0,
      voteScore: 0, userVote: 0, createdAt: new Date().toISOString(),
    };
    lastSentPostRef.current = tempId;
    setPosts((prev) => [...prev, optimisticPost]);
    scrollToBottom();
    try {
      const real = await forumService.createPost(classId, { content: fullContent, category: 'DISCUSSION', discussionId: activeDiscussionId || undefined });
      // Upload attachment if present
      if (fileToSend) {
        try {
          const uploaded = await forumService.uploadFile(classId, fileToSend);
          await forumService.addAttachment({ postId: real.id, fileName: uploaded.fileName, fileUrl: uploaded.fileUrl, fileType: uploaded.fileType, fileSizeBytes: uploaded.fileSizeBytes });
        } catch { showToast('Pesan terkirim tapi lampiran gagal diupload.', 'error'); }
      }
      if (fileToSend) { fetchPosts(); } else { setPosts((prev) => prev.map((p) => p.id === tempId ? { ...real, authorName: real.authorName || 'Anda' } : p)); }
    } catch {
      setPosts((prev) => prev.filter((p) => p.id !== tempId));
      showToast('Gagal mengirim pesan.', 'error');
    } finally { setIsSending(false); }
  };

  // Special post
  const handleCreateSpecial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialContent.trim()) return;
    setIsCreatingSpecial(true);
    try {
      let content = specialContent.trim();
      if (specialCategory === 'REMINDER' && reminderContext !== 'general' && reminderContextId) {
        let contextLabel = '';
        if (reminderContext === 'task') { const task = tasks?.find(t => t.id === reminderContextId); contextLabel = task ? `📋 Tugas: ${task.title}` : ''; }
        else if (reminderContext === 'session') { const sess = sessions?.find(s => s.id === reminderContextId); contextLabel = sess ? `📅 Pertemuan: ${sess.title}` : ''; }
        if (contextLabel) content = `${contextLabel}\n\n${content}`;
      }
      await forumService.createPost(classId, {
        title: specialTitle.trim() || undefined, content, category: specialCategory,
        discussionId: activeDiscussionId || undefined,
        pollOptions: specialCategory === 'POLL' ? pollOptions.filter((o) => o.trim()) : undefined,
        pollMultiple: specialCategory === 'POLL' ? pollMultiple : undefined,
        remindAt: specialCategory === 'REMINDER' ? remindAt : undefined,
      });
      setShowSpecialPost(false); setSpecialTitle(''); setSpecialContent(''); setPollOptions(['', '']); setPollMultiple(false); setRemindAt('');
      setReminderContext('general'); setReminderContextId('');
      fetchPosts();
    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal.', 'error'); }
    finally { setIsCreatingSpecial(false); }
  };

  // Poll vote
  const handlePollVote = async (postId: string, optionId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post?.poll) return;
    const isMultiple = post.poll.multiple;
    const userVoted = post.poll.userVotes.includes(optionId);

    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId || !p.poll) return p;
      if (isMultiple) {
        // Checkbox: toggle individual option
        return { ...p, poll: { ...p.poll, options: p.poll.options.map((o) => o.id === optionId ? { ...o, voteCount: o.voteCount + (userVoted ? -1 : 1) } : o), userVotes: userVoted ? p.poll.userVotes.filter((v) => v !== optionId) : [...p.poll.userVotes, optionId] } };
      } else {
        // Radio: deselect previous, select new (or unvote if same)
        const prevVotes = p.poll.userVotes;
        if (userVoted) {
          // Unvote
          return { ...p, poll: { ...p.poll, options: p.poll.options.map((o) => o.id === optionId ? { ...o, voteCount: o.voteCount - 1 } : o), userVotes: [] } };
        } else {
          // Deselect old, select new
          return { ...p, poll: { ...p.poll, options: p.poll.options.map((o) => {
            if (o.id === optionId) return { ...o, voteCount: o.voteCount + 1 };
            if (prevVotes.includes(o.id)) return { ...o, voteCount: Math.max(0, o.voteCount - 1) };
            return o;
          }), userVotes: [optionId] } };
        }
      }
    }));
    try { await forumService.votePoll(optionId); } catch { fetchPosts(); }
  };

  // Actions
  const handleDeletePost = async (postId: string) => {
    const ok = await confirm({ title: 'Hapus Pesan', message: 'Hapus pesan ini?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId)); setContextMenu(null);
    try { await forumService.deletePost(postId); } catch { fetchPosts(); }
  };

  const handleTogglePin = async (postId: string) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPinned: !p.isPinned } : p)); setContextMenu(null);
    try { await forumService.togglePin(postId); } catch { fetchPosts(); }
  };

  // Discussion CRUD
  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscTitle.trim()) return;
    setIsCreatingDisc(true);
    try {
      const disc = await forumService.createDiscussion(classId, {
        title: newDiscTitle.trim(),
        description: newDiscDesc.trim() || undefined,
        taskId: newDiscContext === 'task' && newDiscTaskId ? newDiscTaskId : undefined,
        sessionId: newDiscContext === 'session' && newDiscSessionId ? newDiscSessionId : undefined,
        assignType: discAssignType,
        assignedUserIds: discAssignType === 'INDIVIDUAL' ? discAssignedUserIds : undefined,
        assignedGroupId: discAssignType === 'GROUP' ? discAssignedGroupId : undefined,
      });
      setShowCreateDiscussion(false); setNewDiscTitle(''); setNewDiscDesc('');
      setNewDiscContext('general'); setNewDiscTaskId(''); setNewDiscSessionId('');
      setDiscAssignType('ALL'); setDiscAssignedUserIds([]); setDiscAssignedGroupId('');
      fetchDiscussions();
      handleSelectDiscussion(disc.id);
    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal membuat pembahasan.', 'error'); }
    finally { setIsCreatingDisc(false); }
  };

  const handleEditDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscussion || !editDiscTitle.trim()) return;
    setIsSavingDisc(true);
    try {
      await forumService.updateDiscussion(editingDiscussion.id, {
        title: editDiscTitle.trim(),
        description: editDiscDesc.trim() || undefined,
        assignType: editDiscAssignType,
        assignedUserIds: editDiscAssignType === 'INDIVIDUAL' ? editDiscAssignedUserIds : undefined,
        assignedGroupId: editDiscAssignType === 'GROUP' ? editDiscAssignedGroupId : undefined,
      });
      setEditingDiscussion(null);
      fetchDiscussions();
      showToast('Pembahasan diperbarui.', 'success');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal mengedit pembahasan.', 'error'); }
    finally { setIsSavingDisc(false); }
  };

  const openEditDiscussion = (disc: ForumDiscussion) => {
    setEditDiscTitle(disc.title);
    setEditDiscDesc(disc.description || '');
    setEditDiscAssignType((disc.assignType as any) || 'ALL');
    setEditDiscAssignedUserIds(disc.assignedUserIds || []);
    setEditDiscAssignedGroupId(disc.assignedGroupId || '');
    setEditingDiscussion(disc);
  };

  const handleDeleteDiscussion = async (discId: string) => {
    const ok = await confirm({ title: 'Hapus Pembahasan', message: 'Semua pesan dalam pembahasan ini akan dihapus.', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try { await forumService.deleteDiscussion(discId); if (activeDiscussionId === discId) setActiveDiscussionId(null); fetchDiscussions(); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal.', 'error'); }
  };

  // File upload - stage into editor, send on submit
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) { showToast('Hanya gambar (jpg/png/gif/webp) dan PDF yang diizinkan.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Ukuran file maksimal 10MB.', 'error'); return; }
    setPendingFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPendingFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPendingFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    inputRef.current?.focus();
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setPendingFilePreview(null);
  };

  // Time helpers
  const timeAgo = (date: string) => {
    const d = new Date(date); const diff = Date.now() - d.getTime(); const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja'; if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60); if (hours < 24) return `${hours}j`;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date); const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Hari Ini';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Filtered & grouped
  const filteredPosts = chatSearch.trim()
    ? posts.filter(p => p.content.toLowerCase().includes(chatSearch.toLowerCase()) || p.authorName.toLowerCase().includes(chatSearch.toLowerCase()))
    : posts;
  const groupedPosts: { date: string; posts: ForumPost[] }[] = [];
  filteredPosts.forEach((post) => {
    const dateKey = new Date(post.createdAt).toDateString();
    const last = groupedPosts[groupedPosts.length - 1];
    if (last && last.date === dateKey) last.posts.push(post);
    else groupedPosts.push({ date: dateKey, posts: [post] });
  });
  const pinnedPosts = posts.filter((p) => p.isPinned);

  const allAttachments = useMemo(() => {
    const atts: (ForumAttachment & { postAuthor: string; postDate: string; postId: string })[] = [];
    posts.forEach(post => {
      if (post.attachments && post.attachments.length > 0) {
        post.attachments.forEach(att => atts.push({ ...att, postAuthor: post.authorName, postDate: post.createdAt, postId: post.id }));
      }
    });
    return atts;
  }, [posts]);

  // Build a stable color map: assign each unique authorId an index-based color
  // so members with similar names still get distinct colors
  const memberColorMap = useMemo(() => {
    const map = new Map<string, [string, string]>();
    const seen: string[] = [];
    posts.forEach(p => {
      if (!map.has(p.authorId)) {
        // Use index-based first, fall back to hash for overflow
        const idx = seen.length;
        if (idx < MEMBER_COLORS.length) {
          map.set(p.authorId, MEMBER_COLORS[idx]);
        } else {
          map.set(p.authorId, getMemberColor(p.authorId));
        }
        seen.push(p.authorId);
      }
    });
    return map;
  }, [posts]);

  // ─── RENDER ───────────────────────────────────────────────────────────
  // On mobile: show EITHER sidebar OR chat, never both
  const showSidebar = isMobile ? sidebarOpen : sidebarOpen;
  const showChat = isMobile ? !sidebarOpen : true;

  return (
    <div className="forum-container" style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
      {/* ═══ DISCUSSIONS SIDEBAR ═══ */}
      {showSidebar && (
        <div className="forum-sidebar" style={{ width: isMobile ? '100%' : 220, minWidth: isMobile ? '100%' : 220, borderRight: isMobile ? 'none' : '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', background: isMobile ? 'rgb(var(--bg-surface))' : 'rgba(var(--color-primary) / 0.01)', flexShrink: 0 }}>
          <div className="forum-sidebar-header" style={{ padding: '0.6rem 0.65rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pembahasan</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              <button onClick={() => setShowCreateDiscussion(true)} title="Buat pembahasan baru" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', padding: '0.15rem', display: 'flex' }}>
                <Plus size={14} />
              </button>
              {/* Hide close button on mobile — sidebar IS the main view */}
              {!isMobile && (
                <button onClick={() => setSidebarOpen(false)} title="Tutup sidebar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.15rem', display: 'flex', borderRadius: '4px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--color-primary) / 0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
                  <ChevronLeft size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Search discussions */}
          <div style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--border-default)' }}>
            <TextInput value={discSearch} onChange={v => setDiscSearch(v)} placeholder="Cari pembahasan..." leftIcon={<Search size={12} />} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Umum */}
            <button onClick={() => { handleSelectDiscussion(null); }} style={{
              width: '100%', padding: '0.55rem 0.65rem', background: activeDiscussionId === null ? 'rgba(var(--color-primary) / 0.08)' : 'none',
              border: 'none', borderLeft: activeDiscussionId === null ? '3px solid rgb(var(--color-primary))' : '3px solid transparent',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              color: activeDiscussionId === null ? 'rgb(var(--color-primary))' : (unreadCounts['__umum__'] ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))'),
              fontWeight: (activeDiscussionId === null || unreadCounts['__umum__']) ? 600 : 400, fontSize: 'var(--font-sm)', transition: 'all 0.1s',
            }}>
              <Hash size={14} /> Umum
              {hasFeature('unread_tracking') && unreadCounts['__umum__'] > 0 && (
                <span style={{ marginLeft: 'auto', background: 'rgb(var(--color-primary))', color: '#fff', borderRadius: '999px', padding: '0 0.35rem', fontSize: '0.55rem', fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px' }}>
                  {unreadCounts['__umum__']}
                </span>
              )}
            </button>

            {discussions.filter(d => !discSearch.trim() || d.title.toLowerCase().includes(discSearch.toLowerCase())).map((disc) => {
              const unread = unreadCounts[disc.id] || 0;
              return (
              <div key={disc.id} style={{ position: 'relative' }}>
                <button onClick={() => { handleSelectDiscussion(disc.id); }} style={{
                  width: '100%', padding: '0.5rem 0.65rem', background: activeDiscussionId === disc.id ? 'rgba(var(--color-primary) / 0.08)' : 'none',
                  border: 'none', borderLeft: activeDiscussionId === disc.id ? '3px solid rgb(var(--color-primary))' : '3px solid transparent',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  color: activeDiscussionId === disc.id ? 'rgb(var(--color-primary))' : (unread ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))'),
                  fontWeight: (activeDiscussionId === disc.id || unread) ? 600 : 400, fontSize: 'var(--font-sm)', transition: 'all 0.1s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Hash size={13} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{disc.title}</span>
                    {hasFeature('unread_tracking') && unread > 0 && (
                      <span style={{ background: 'rgb(var(--color-primary))', color: '#fff', borderRadius: '999px', padding: '0 0.35rem', fontSize: '0.55rem', fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px', flexShrink: 0 }}>
                        {unread}
                      </span>
                    )}
                  </div>
                  {disc.task && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem', paddingLeft: '1.1rem' }}>
                      <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📋 {disc.task.title}{disc.task.groupName ? ` • ${disc.task.groupName}` : ''}
                      </span>
                    </div>
                  )}
                  {disc.session && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem', paddingLeft: '1.1rem' }}>
                      <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📅 Pertemuan {disc.session.sequence}: {disc.session.title}
                      </span>
                    </div>
                  )}
                </button>
                {/* Discussion dropdown menu */}
                {(disc.authorId === userId || canDiscussion) && activeDiscussionId === disc.id && (
                  <div style={{ position: 'absolute', right: '0.4rem', top: '0.4rem' }}>
                    <button onClick={(e) => { e.stopPropagation(); setDiscMenuId(discMenuId === disc.id ? null : disc.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.15rem', display: 'flex', opacity: 0.5, borderRadius: '4px' }}>
                      <MoreVertical size={12} />
                    </button>
                    {discMenuId === disc.id && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setDiscMenuId(null)} />
                        <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 99, background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: '0.25rem', minWidth: 120 }}>
                          <button onClick={() => { setDiscMenuId(null); openEditDiscussion(disc); }} style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-primary))', textAlign: 'left', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--color-primary) / 0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                            <Pencil size={12} /> Edit
                          </button>
                          {!disc.isDefault && (
                            <button onClick={() => { setDiscMenuId(null); handleDeleteDiscussion(disc.id); }} style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-xs)', color: 'rgb(var(--color-danger))', textAlign: 'left', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--color-danger) / 0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                              <Trash2 size={12} /> Hapus
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT AREA ═══ */}
      {showChat && (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: isMobile ? '100%' : undefined }}>
        {/* Chat header */}
        <div className="forum-chat-header" style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, background: 'rgba(var(--color-primary) / 0.01)' }}>
          {/* Mobile back button — always visible on mobile when chat is showing */}
          {isMobile && (
            <button className="forum-back-btn" onClick={handleMobileBack} title="Kembali ke pembahasan" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.25rem', display: 'flex', borderRadius: '4px', transition: 'all 0.15s' }}>
              <ChevronLeft size={18} />
            </button>
          )}
          {!sidebarOpen && !isMobile && (
            <button onClick={() => setSidebarOpen(true)} title="Tampilkan pembahasan" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.15rem', display: 'flex', borderRadius: '4px', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgb(var(--color-primary))'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgb(var(--text-muted))'; }}>
              <MessagesSquare size={15} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Hash size={14} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                {activeDiscussion ? activeDiscussion.title : 'Umum'}
              </span>
            </div>
            {activeDiscussion?.description && (
              <p style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeDiscussion.description}</p>
            )}
          </div>
          {activeDiscussion?.task && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(var(--color-warning) / 0.08)', fontSize: '0.6rem', color: 'rgb(var(--color-warning))', fontWeight: 600, flexShrink: 0 }}>
              📋 {activeDiscussion.task.title}
              {activeDiscussion.task.groupName && <><span style={{ opacity: 0.5 }}>•</span> <UsersIcon size={9} /> {activeDiscussion.task.groupName}</>}
            </div>
          )}
          {activeDiscussion?.session && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(var(--color-primary) / 0.08)', fontSize: '0.6rem', color: 'rgb(var(--color-primary))', fontWeight: 600, flexShrink: 0 }}>
              📅 Pertemuan {activeDiscussion.session.sequence}
            </div>
          )}
          <button onClick={() => { setShowChatSearch(p => !p); if (showChatSearch) setChatSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: showChatSearch ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', padding: '0.2rem', display: 'flex' }}>
            <Search size={14} />
          </button>
        </div>

        {showChatSearch && (
          <div style={{ padding: '0.35rem 0.75rem', borderBottom: '1px solid var(--border-default)', background: 'rgba(var(--color-primary) / 0.02)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <Search size={13} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
            <TextInput value={chatSearch} onChange={v => setChatSearch(v)} placeholder="Cari pesan..." autoFocus />
            {chatSearch && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{filteredPosts.length} hasil</span>}
            <button onClick={() => { setShowChatSearch(false); setChatSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.15rem' }}><X size={14} /></button>
          </div>
        )}

        {/* Discussion Sub-Tabs: Chat, Lampiran, Canvas tabs, + button */}
        <div className="forum-tab-bar animate-fade-in" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', flexShrink: 0, background: 'rgba(var(--color-primary) / 0.01)', paddingLeft: '0.75rem', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setDiscussionTab('chat')} style={{
            padding: '0.45rem 0.85rem', fontSize: 'var(--font-xs)', fontWeight: discussionTab === 'chat' ? 700 : 500,
            color: discussionTab === 'chat' ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
            background: 'none', border: 'none', borderBottom: discussionTab === 'chat' ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease',
          }}>
            💬 Chat
          </button>
          <button onClick={() => setDiscussionTab('lampiran')} style={{
            padding: '0.45rem 0.85rem', fontSize: 'var(--font-xs)', fontWeight: discussionTab === 'lampiran' ? 700 : 500,
            color: discussionTab === 'lampiran' ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
            background: 'none', border: 'none', borderBottom: discussionTab === 'lampiran' ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease',
          }}>
            📎 Lampiran{allAttachments.length > 0 ? ` (${allAttachments.length})` : ''}
          </button>
          {customTabs.map((ct) => (
            <div key={ct.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button onClick={() => { setDiscussionTab(ct.id); }} style={{
                padding: '0.45rem 0.85rem', fontSize: 'var(--font-xs)', fontWeight: discussionTab === ct.id ? 700 : 500,
                color: discussionTab === ct.id ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                background: 'none', border: 'none', borderBottom: discussionTab === ct.id ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
              }}>
                <StickyNote size={11} /> {ct.name}
              </button>
              {discussionTab === ct.id && canCanvas && (
                <button onClick={(e) => { e.stopPropagation(); setTabMenuId(tabMenuId === ct.id ? null : ct.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.1rem', display: 'flex', opacity: 0.6 }}>
                  <MoreHorizontal size={10} />
                </button>
              )}
              {tabMenuId === ct.id && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setTabMenuId(null)} />
                  <div style={{ position: 'absolute', left: 0, top: '100%', zIndex: 99, background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: '0.25rem', minWidth: 130 }}>
                    <button onClick={() => { setRenamingTabId(ct.id); setRenameValue(ct.name); setTabMenuId(null); }} style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-primary))', textAlign: 'left', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--color-primary) / 0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <Pencil size={12} /> Rename
                    </button>
                    <button onClick={() => { setTabMenuId(null); handleDeleteTab(ct.id); }} style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-xs)', color: 'rgb(var(--color-danger))', textAlign: 'left', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--color-danger) / 0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <Trash2 size={12} /> Hapus
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {customTabs.length < 2 && canCanvas && (
            <button onClick={() => { setNewTabName(''); setShowCreateTabModal(true); }} title="Buat canvas baru" style={{
              padding: '0.35rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.2rem',
              fontSize: 'var(--font-xs)', fontFamily: 'inherit', transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgb(var(--color-primary))')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgb(var(--text-muted))')}>
              <Plus size={12} />
            </button>
          )}
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        {activeCustomTab ? (
          /* ═══ CANVAS CONTENT ═══ */
          <>
            <div style={{ padding: '0.35rem 0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, background: 'rgba(var(--color-primary) / 0.01)' }}>
              <StickyNote size={13} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))', flex: 1 }}>{activeCustomTab.name}</span>
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                {canvasDirty && (
                  <span style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', fontStyle: 'italic' }}>Belum disimpan</span>
                )}
                <Button size="sm" onClick={handleSaveTabContent} disabled={savingTabContent || !canvasDirty} leftIcon={savingTabContent ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />} style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--font-xs)' }}>
                  {savingTabContent ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0.75rem', flex: 1 }}>
                <RichTextEditor
                  content={canvasContent}
                  onChange={handleCanvasChange}
                  placeholder="Klik di sini untuk mulai menulis..."
                  minHeight={200}
                />
              </div>
              <div style={{ borderTop: '1px solid var(--border-default)', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgb(var(--text-secondary))' }}>
                    <Paperclip size={12} /> Lampiran {activeCustomTab.files.length > 0 && `(${activeCustomTab.files.length})`}
                  </h4>
                  <div>
                    <input ref={tabFileInputRef} type="file" onChange={handleUploadTabFile} style={{ display: 'none' }} />
                    <Button size="sm" variant="ghost" onClick={() => tabFileInputRef.current?.click()} disabled={uploadingTabFile} leftIcon={uploadingTabFile ? <Loader2 className="animate-spin" size={11} /> : <Upload size={11} />} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>Upload</Button>
                  </div>
                </div>
                {activeCustomTab.files.length === 0 ? (
                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-default)', textAlign: 'center', cursor: 'pointer', color: 'rgb(var(--text-muted))' }} onClick={() => tabFileInputRef.current?.click()}>
                    <Paperclip size={18} style={{ margin: '0 auto 0.3rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.65rem' }}>Klik untuk upload file</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {activeCustomTab.files.map(file => (
                      <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--input-bg)' }}>
                        {file.fileType === 'IMAGE' ? <ImageIcon size={14} style={{ color: 'rgb(var(--color-success))', flexShrink: 0 }} /> : <FileText size={14} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />}
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 'var(--font-xs)', fontWeight: 500, color: 'rgb(var(--color-primary))', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</a>
                        <span style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', flexShrink: 0 }}>{formatFileSize(file.fileSizeBytes)}</span>
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--text-muted))', padding: '0.1rem', display: 'flex', flexShrink: 0 }}><Download size={12} /></a>
                        <button onClick={() => handleDeleteTabFile(file.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-danger))', padding: '0.1rem', display: 'flex', flexShrink: 0 }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {activeCustomTab.files.filter(f => f.fileType === 'IMAGE').length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.4rem', marginTop: '0.3rem' }}>
                        {activeCustomTab.files.filter(f => f.fileType === 'IMAGE').map(file => (
                          <a key={file.id} href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                            <img src={file.fileUrl} alt={file.fileName} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : discussionTab === 'chat' ? (loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={24} style={{ color: 'rgb(var(--color-primary))' }} /></div>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <div style={{ padding: '0.3rem 0.5rem', background: 'rgba(var(--color-warning) / 0.04)', borderBottom: '1px solid rgba(var(--color-warning) / 0.1)', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, overflowX: 'auto' }}>
                <Pin size={10} style={{ color: 'rgb(var(--color-warning))', flexShrink: 0 }} />
                {pinnedPosts.map((pp) => (
                  <span key={pp.id} style={{ background: 'rgba(var(--color-warning) / 0.08)', borderRadius: '3px', padding: '0.1rem 0.35rem', fontSize: '0.6rem', color: 'rgb(var(--color-warning))', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {pp.title.slice(0, 35)}{pp.title.length > 35 ? '...' : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Chat messages */}
            <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', position: 'relative' }}>
              {/* Date Jump Dropdown */}
              {groupedPosts.length > 1 && (
                <div style={{ position: 'sticky', top: 0, zIndex: 15, display: 'flex', justifyContent: 'center', paddingBottom: '0.25rem' }}>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setDateJumpOpen(p => !p)} className="btn-bounce" style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem',
                      background: 'var(--modal-bg)', border: '1px solid var(--border-default)', borderRadius: '999px',
                      cursor: 'pointer', fontSize: '0.6rem', fontWeight: 600, color: 'rgb(var(--text-muted))',
                      boxShadow: 'var(--shadow-sm)', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}>
                      <Calendar size={10} /> Loncat ke tanggal <ChevronDown size={10} style={{ transform: dateJumpOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {dateJumpOpen && (
                      <>
                        <div onClick={() => setDateJumpOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 14 }} />
                        <div className="animate-scale-in" style={{
                          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '0.3rem',
                          background: 'var(--modal-bg)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-lg)', padding: '0.25rem 0', minWidth: 170, zIndex: 16, maxHeight: 220, overflowY: 'auto',
                        }}>
                          {groupedPosts.map((g) => (
                            <button key={g.date} onClick={() => {
                              const el = dateRefs.current[g.date];
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              setDateJumpOpen(false);
                            }} style={{
                              display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', padding: '0.45rem 0.75rem',
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-xs)', fontWeight: 500,
                              color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.1s',
                            }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--color-primary) / 0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                              <Calendar size={11} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
                              {formatDate(g.posts[0].createdAt)}
                              <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))', marginLeft: 'auto' }}>{g.posts.length}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {posts.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.35 }}>
                  <MessagesSquare size={40} style={{ color: 'rgb(var(--text-muted))' }} />
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>{activeDiscussion ? `Mulai diskusi "${activeDiscussion.title}"` : 'Mulai percakapan!'}</p>
                </div>
              ) : groupedPosts.map((group) => (
                <React.Fragment key={group.date}>
                  <div ref={(el) => { dateRefs.current[group.date] = el; }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.65rem 0 0.35rem', flexShrink: 0 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
                    <span style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', padding: '0.15rem 0.6rem', background: 'var(--input-bg)', borderRadius: '999px', whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '0.01em' }}>{formatDate(group.posts[0].createdAt)}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
                  </div>

                  {group.posts.map((post, postIdx) => {
                    const isOwn = post.authorId === userId;
                    const cat = CATEGORY_CONFIG[post.category] || CATEGORY_CONFIG.DISCUSSION;
                    const prevPost = postIdx > 0 ? group.posts[postIdx - 1] : null;
                    const nextPost = postIdx < group.posts.length - 1 ? group.posts[postIdx + 1] : null;
                    const isSameAuthorAsPrev = prevPost && prevPost.authorId === post.authorId && prevPost.category === 'DISCUSSION' && post.category === 'DISCUSSION';
                    const isSameAuthorAsNext = nextPost && nextPost.authorId === post.authorId && nextPost.category === 'DISCUSSION' && post.category === 'DISCUSSION';
                    const isFirstInGroup = !isSameAuthorAsPrev;
                    const isLastInGroup = !isSameAuthorAsNext;

                    // ── ANNOUNCEMENT ──
                    if (post.category === 'ANNOUNCEMENT') {
                      return (
                        <div key={post.id} ref={el => { postRefs.current[post.id] = el; }} className="chat-msg-enter" style={{ margin: '0.5rem 0' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(var(--color-secondary) / 0.06), rgba(var(--color-primary) / 0.03))',
                            border: '1px solid rgba(var(--color-secondary) / 0.12)', borderRadius: '14px',
                            padding: '0.85rem 1rem', position: 'relative', overflow: 'hidden',
                          }}>
                            <div style={{ position: 'absolute', top: -8, right: -8, width: 50, height: 50, borderRadius: '50%', background: 'rgba(var(--color-secondary) / 0.06)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--color-secondary) / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Megaphone size={12} style={{ color: cat.color }} />
                              </div>
                              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pengumuman</span>
                              {post.isPinned && <Pin size={9} style={{ color: 'rgb(var(--color-warning))', marginLeft: '0.15rem' }} />}
                            </div>
                            {post.title !== post.content.slice(0, 80).trim() && <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '0.25rem', color: 'rgb(var(--text-primary))' }}>{post.title}</h4>}
                            <p style={{ fontSize: 'var(--font-base)', color: 'rgb(var(--text-secondary))', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{parseContent(post.content, sessions, onNavigate, classMembers, setSelectedMember, tasks)}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                              <span style={{ fontWeight: 600 }}>{post.authorName}</span>
                              <span style={{ opacity: 0.6 }}>•</span>
                              <span>{timeAgo(post.createdAt)}</span>
                              <button onClick={() => { setReplyToPost({ id: post.id, authorName: post.authorName, content: post.content.slice(0, 100) }); inputRef.current?.focus(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)', display: 'flex', alignItems: 'center', gap: '0.15rem', fontFamily: 'inherit', marginLeft: 'auto' }}><Reply size={10} /> Balas</button>
                              {(isOwn || canDelete) && <button onClick={(e) => { e.stopPropagation(); setContextMenu({ postId: post.id, x: e.clientX, y: e.clientY }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 0 }}><MoreVertical size={12} /></button>}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── POLL ──
                    if (post.category === 'POLL' && post.poll) {
                      const totalVotes = post.poll.options.reduce((s, o) => s + o.voteCount, 0);
                      return (
                        <div key={post.id} ref={el => { postRefs.current[post.id] = el; }} className="chat-msg-enter" style={{ margin: '0.5rem 0' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.05), rgba(var(--color-accent, var(--color-primary)) / 0.03))',
                            border: '1px solid rgba(var(--color-primary) / 0.1)', borderRadius: '14px',
                            padding: '0.85rem 1rem', position: 'relative', overflow: 'hidden',
                          }}>
                            <div style={{ position: 'absolute', top: -10, right: -10, width: 55, height: 55, borderRadius: '50%', background: 'rgba(var(--color-primary) / 0.04)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.45rem' }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--color-primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BarChart3 size={12} style={{ color: cat.color }} />
                              </div>
                              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Voting</span>
                            </div>
                            <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '0.15rem', color: 'rgb(var(--text-primary))' }}>{post.title}</h4>
                            {post.content !== post.title && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '0.45rem', lineHeight: 1.5 }}>{post.content}</p>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {post.poll.options.map((opt) => {
                                const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                                const voted = post.poll!.userVotes.includes(opt.id);
                                return (
                                  <button key={opt.id} onClick={() => handlePollVote(post.id, opt.id)} className="btn-bounce" style={{
                                    position: 'relative', padding: '0.5rem 0.65rem', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                                    border: voted ? '1.5px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                                    background: voted ? 'rgba(var(--color-primary) / 0.04)' : 'var(--input-bg)', overflow: 'hidden', fontSize: 'var(--font-sm)',
                                    transition: 'all 0.2s ease',
                                  }}>
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: voted ? 'rgba(var(--color-primary) / 0.08)' : 'rgba(var(--text-muted) / 0.03)', transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)' }} />
                                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: voted ? 700 : 500, color: voted ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))' }}>{opt.label}</span>
                                      <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 600 }}>{pct}%</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600 }}>{totalVotes} suara</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span>{post.poll.multiple ? 'Boleh pilih banyak' : 'Pilih satu'}</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span>{post.authorName}</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span>{timeAgo(post.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── REMINDER ──
                    if (post.category === 'REMINDER') {
                      return (
                        <div key={post.id} ref={el => { postRefs.current[post.id] = el; }} className="chat-msg-enter" style={{ margin: '0.5rem 0' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(var(--color-warning) / 0.06), rgba(var(--color-warning) / 0.02))',
                            border: '1px solid rgba(var(--color-warning) / 0.12)', borderRadius: '14px',
                            padding: '0.85rem 1rem', position: 'relative', overflow: 'hidden',
                          }}>
                            <div style={{ position: 'absolute', top: -8, right: -8, width: 50, height: 50, borderRadius: '50%', background: 'rgba(var(--color-warning) / 0.05)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--color-warning) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bell size={12} style={{ color: cat.color }} />
                              </div>
                              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pengingat</span>
                            </div>
                            <p style={{ fontSize: 'var(--font-base)', fontWeight: 600, margin: 0, lineHeight: 1.6, color: 'rgb(var(--text-primary))' }}>{parseContent(post.content, sessions, onNavigate, classMembers, setSelectedMember, tasks)}</p>
                            {post.reminder && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.4rem', padding: '0.3rem 0.6rem', borderRadius: '8px', background: 'rgba(var(--color-warning) / 0.08)', fontSize: 'var(--font-xs)', fontWeight: 600, color: cat.color }}>
                                ⏰ {new Date(post.reminder.remindAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.35rem' }}>{post.authorName} <span style={{ opacity: 0.4 }}>•</span> {timeAgo(post.createdAt)}</div>
                          </div>
                        </div>
                      );
                    }

                    // ── QUESTION ──
                    if (post.category === 'QUESTION') {
                      return (
                        <div key={post.id} ref={el => { postRefs.current[post.id] = el; }} className="chat-msg-enter" style={{ margin: '0.5rem 0' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(var(--color-warning) / 0.05), rgba(var(--color-warning) / 0.01))',
                            border: '1px solid rgba(var(--color-warning) / 0.1)', borderRadius: '14px',
                            padding: '0.85rem 1rem', borderLeft: '4px solid rgb(var(--color-warning))',
                            position: 'relative', overflow: 'hidden',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--color-warning) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <HelpCircle size={12} style={{ color: cat.color }} />
                              </div>
                              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pertanyaan</span>
                              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: 'auto' }}>dari {post.authorName}</span>
                            </div>
                            <p style={{ fontSize: 'var(--font-base)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0, color: 'rgb(var(--text-primary))' }}>{parseContent(post.content, sessions, onNavigate, classMembers, setSelectedMember, tasks)}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.45rem', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                              <span>{timeAgo(post.createdAt)}</span>
                              <button onClick={() => { setReplyToPost({ id: post.id, authorName: post.authorName, content: post.content.slice(0, 100) }); inputRef.current?.focus(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', fontSize: 'var(--font-xs)', display: 'flex', alignItems: 'center', gap: '0.15rem', fontFamily: 'inherit', fontWeight: 600 }}><Reply size={10} /> Jawab</button>
                              {(isOwn || canDelete) && <button onClick={(e) => { e.stopPropagation(); setContextMenu({ postId: post.id, x: e.clientX, y: e.clientY }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 0, marginLeft: 'auto' }}><MoreVertical size={12} /></button>}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── REGULAR CHAT BUBBLE ──
                    const replyMatch = post.content.match(/^\[reply:([^:]+):([^\]]*)\]\n?([\s\S]*)$/);
                    const replyRefId = replyMatch?.[1];
                    const replyRefAuthor = replyMatch?.[2];
                    const actualContent = replyMatch ? replyMatch[3] : post.content;
                    const replyRefPost = replyRefId ? posts.find(p => p.id === replyRefId) : null;
                    const replyPreview = replyRefPost ? replyRefPost.content.replace(/^\[reply:[^\]]*\]\n?/, '').slice(0, 80) : '';

                    // Per-member color from stable map
                    const [avatarC1, avatarC2] = memberColorMap.get(post.authorId) || getMemberColor(post.authorId);

                    return (
                      <div key={post.id} ref={el => { postRefs.current[post.id] = el; }} className="chat-msg-enter" style={{
                        display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginBottom: isLastInGroup ? '0.5rem' : '0.1rem',
                        marginTop: isFirstInGroup && postIdx > 0 ? '0.25rem' : 0,
                        gap: '0.4rem', alignItems: 'flex-end', paddingLeft: !isOwn ? 0 : undefined,
                      }}>
                        {/* Avatar: only show on last message of consecutive group */}
                        {!isOwn && (
                          <div style={{ width: 30, height: 30, flexShrink: 0, visibility: isLastInGroup ? 'visible' : 'hidden' }}>
                            {post.authorAvatar ? (
                              <img
                                src={post.authorAvatar}
                                alt={post.authorName}
                                style={{
                                  width: 30, height: 30, borderRadius: '50%',
                                  objectFit: 'cover',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                }}
                              />
                            ) : (
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%',
                                background: `linear-gradient(135deg, ${avatarC1}, ${avatarC2})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                              }}>
                                {post.authorName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="chat-bubble" style={{
                          maxWidth: '72%', padding: '0.5rem 0.75rem', position: 'relative',
                          background: isOwn
                            ? 'linear-gradient(135deg, rgba(var(--color-primary) / 0.12), rgba(var(--color-primary) / 0.06))'
                            : 'rgb(var(--bg-elevated))',
                          borderRadius: isOwn
                            ? `${isFirstInGroup ? '18px' : '6px'} ${isFirstInGroup ? '18px' : '6px'} ${isLastInGroup ? '4px' : '6px'} 18px`
                            : `${isFirstInGroup ? '18px' : '6px'} 18px 18px ${isLastInGroup ? '4px' : '6px'}`,
                          border: isOwn ? '1px solid rgba(var(--color-primary) / 0.1)' : '1px solid var(--border-default)',
                          borderLeft: !isOwn ? `3px solid ${avatarC1}` : undefined,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}>
                          {activeDiscussion?.task?.assignType === 'GROUP' && activeDiscussion?.task?.groupName && !isOwn && isFirstInGroup && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.15rem' }}>
                              <UsersIcon size={9} style={{ color: 'rgb(var(--color-secondary))' }} />
                              <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'rgb(var(--color-secondary))' }}>{activeDiscussion.task.groupName}</span>
                            </div>
                          )}
                          {!isOwn && isFirstInGroup && (
                            <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: avatarC1, display: 'block', marginBottom: '0.1rem' }}>
                              {post.authorName}
                            </span>
                          )}
                          {replyRefId && (
                            <div style={{ borderLeft: `3px solid ${isOwn ? 'rgba(var(--color-primary) / 0.5)' : avatarC1}`, background: 'rgba(var(--color-primary) / 0.03)', borderRadius: '0 8px 8px 0', padding: '0.25rem 0.5rem', marginBottom: '0.3rem' }}>
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: isOwn ? 'rgb(var(--color-primary))' : avatarC1 }}>{replyRefAuthor || 'Unknown'}</span>
                              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyPreview || '...'}</p>
                            </div>
                          )}
                          <p style={{ fontSize: 'var(--font-base)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, color: 'rgb(var(--text-primary))' }}>{parseContent(actualContent, sessions, onNavigate, classMembers, setSelectedMember, tasks)}</p>
                          {post.attachments && post.attachments.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                              {post.attachments.map((att) => {
                                const isImage = att.fileType?.startsWith('image/');
                                const isPdf = att.fileType === 'application/pdf';
                                if (isImage) {
                                  return (
                                    <div key={att.id} onClick={() => setPreviewImage(att.fileUrl)} style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-default)', maxWidth: '220px' }}>
                                      <img src={att.fileUrl} alt={att.fileName} style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }} />
                                    </div>
                                  );
                                }
                                if (isPdf) {
                                  return (
                                    <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer" download style={{
                                      display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.7rem',
                                      borderRadius: '10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.12)',
                                      textDecoration: 'none', color: 'rgb(var(--text-secondary))', transition: 'all 0.15s',
                                    }}>
                                      <FileText size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                                      <div style={{ minWidth: 0 }}>
                                        <span style={{ fontSize: 'var(--font-xs)', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.fileName}</span>
                                        {att.fileSizeBytes && <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))' }}>{(att.fileSizeBytes / 1024).toFixed(0)} KB</span>}
                                      </div>
                                      <Download size={12} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
                                    </a>
                                  );
                                }
                                return (
                                  <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--font-xs)', padding: '0.2rem 0.5rem', borderRadius: '8px', background: 'rgba(var(--color-primary) / 0.08)', color: 'rgb(var(--color-primary))', textDecoration: 'none' }}>📎 {att.fileName.slice(0, 20)}</a>
                                );
                              })}
                            </div>
                          )}
                          <div className="chat-bubble-footer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))' }}>{timeAgo(post.createdAt)}</span>
                            <button onClick={() => { setReplyToPost({ id: post.id, authorName: post.authorName, content: actualContent.slice(0, 100) }); inputRef.current?.focus(); }} className="chat-action-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)', display: 'flex', alignItems: 'center', fontFamily: 'inherit', opacity: 0, transition: 'opacity 0.15s' }}><Reply size={10} /></button>
                            {(isOwn || canDelete) && <button onClick={(e) => { e.stopPropagation(); setContextMenu({ postId: post.id, x: e.clientX, y: e.clientY }); }} className="chat-action-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 0, opacity: 0, transition: 'opacity 0.15s' }}><MoreVertical size={11} /></button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
              <div ref={chatEndRef} />

              {/* Scroll to bottom button */}
              {showScrollBottom && (
                <button onClick={() => scrollToBottom(true)} className="animate-scale-in btn-bounce" style={{
                  position: 'sticky', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)',
                  width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-default)',
                  background: 'var(--modal-bg)', boxShadow: 'var(--shadow-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgb(var(--color-primary))', zIndex: 10,
                  transition: 'all 0.15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgb(var(--color-primary))'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--modal-bg)'; e.currentTarget.style.color = 'rgb(var(--color-primary))'; }}>
                  <ArrowDown size={16} />
                </button>
              )}
            </div>

            {/* Input bar */}
            <div className="forum-input-area" style={{ borderTop: '1px solid var(--border-default)', flexShrink: 0 }}>
              {/* Pending file preview */}
              {pendingFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(var(--color-primary) / 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {pendingFilePreview ? (
                    <img src={pendingFilePreview} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-default)' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} style={{ color: '#ef4444' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 500, color: 'rgb(var(--text-primary))', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
                    <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))' }}>{(pendingFile.size / 1024).toFixed(0)} KB • Tekan kirim untuk mengirim</span>
                  </div>
                  <button onClick={clearPendingFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.2rem' }}><X size={16} /></button>
                </div>
              )}
              {replyToPost && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: 'rgba(var(--color-primary) / 0.04)', borderLeft: '3px solid rgb(var(--color-primary))' }}>
                  <Reply size={12} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgb(var(--color-primary))' }}>{replyToPost.authorName}</span>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyToPost.content.replace(/\[reply:[^\]]*\]\n?/, '')}</p>
                  </div>
                  <button onClick={() => setReplyToPost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.2rem' }}><X size={14} /></button>
                </div>
              )}
              <div style={{ padding: '0.6rem 0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-end', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0, paddingBottom: '0.25rem', position: 'relative' }}>
                  {/* Type dropdown trigger */}
                  <button onClick={() => setShowTypeMenu(p => !p)} title="Tipe pesan" style={{ background: showTypeMenu ? 'rgba(var(--color-primary) / 0.1)' : 'none', border: 'none', cursor: 'pointer', color: showTypeMenu ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', padding: '0.3rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    <Plus size={16} />
                  </button>
                  {/* File upload trigger */}
                  {hasFeature('forum_file_upload') && <button onClick={() => fileInputRef.current?.click()} title="Lampiran (gambar/PDF)" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.3rem', display: 'flex' }}>
                    <Paperclip size={16} />
                  </button>}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                  {/* Type dropdown menu (opens upward) */}
                  {showTypeMenu && (
                    <>
                      <div onClick={() => setShowTypeMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
                      <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '0.35rem', background: 'var(--modal-bg)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: '0.25rem 0', minWidth: 160, zIndex: 30 }}>
                        {canAnnouncement && (
                          <button onClick={() => { setSpecialCategory('ANNOUNCEMENT'); setShowSpecialPost(true); setShowTypeMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left' }}>
                            <Megaphone size={14} style={{ color: 'rgb(var(--color-secondary))' }} /> Pengumuman
                          </button>
                        )}
                        <button onClick={() => { setSpecialCategory('QUESTION'); setShowSpecialPost(true); setShowTypeMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left' }}>
                          <HelpCircle size={14} style={{ color: 'rgb(var(--color-warning))' }} /> Pertanyaan
                        </button>
                        {canPoll && <button onClick={() => { setSpecialCategory('POLL'); setShowSpecialPost(true); setShowTypeMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left' }}>
                          <BarChart3 size={14} style={{ color: 'rgb(var(--color-primary))' }} /> Voting
                        </button>}
                        {canReminder && <button onClick={() => { setSpecialCategory('REMINDER'); setShowSpecialPost(true); setShowTypeMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left' }}>
                          <Bell size={14} style={{ color: 'rgb(var(--color-warning))' }} /> Pengingat
                        </button>}
                      </div>
                    </>
                  )}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '3rem', right: '3rem', background: 'var(--modal-bg)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto', zIndex: 20 }}>
                    {suggestions.slice(0, 8).map((s, i) => (
                      <button key={i} onClick={() => insertTag(s.tag)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit' }}>
                        {s.label} <span style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)' }}>{s.tag}</span>
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', flex: 1, gap: '0.35rem', alignItems: 'flex-end' }}>
                  <TextArea inputRef={inputRef} value={messageText} onChange={handleInputChange} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (messageText.trim() || pendingFile) handleSendMessage(e as any); } }}
                    placeholder={pendingFile ? 'Tambah pesan (opsional)...' : 'Tulis pesan... (ketik @ untuk tag)'} rows={1}
                    autoResize minHeight={38} maxHeight={120} resize="none" />
                  <button type="submit" disabled={(!messageText.trim() && !pendingFile) || isSending} style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: (messageText.trim() || pendingFile) ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary) / 0.2)',
                    color: '#fff', cursor: (messageText.trim() || pendingFile) ? 'pointer' : 'not-allowed', transition: 'background 0.15s',
                  }}>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          </>
        )) : discussionTab === 'lampiran' ? (
          /* ═══ LAMPIRAN TAB ═══ */
          <div className="animate-fade-in" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {allAttachments.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', opacity: 0.4, padding: '3rem 0' }}>
                <Paperclip size={36} style={{ color: 'rgb(var(--text-muted))' }} />
                <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada lampiran di pembahasan ini</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {allAttachments.map((att, idx) => {
                  const isImage = att.fileType?.startsWith('image/');
                  return (
                    <div key={att.id} className="animate-scale-in card-hoverable" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', overflow: 'hidden', background: 'var(--input-bg)', animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}>
                      <div style={{ cursor: 'pointer' }} onClick={() => isImage ? setPreviewImage(att.fileUrl) : window.open(att.fileUrl, '_blank')}>
                        {isImage ? (
                          <img src={att.fileUrl} alt={att.fileName} style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.04)' }}>
                            <FileText size={36} style={{ color: '#ef4444' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.5rem 0.6rem' }}>
                        <p style={{ fontSize: 'var(--font-xs)', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgb(var(--text-primary))' }}>{att.fileName}</p>
                        <p style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', margin: '0.15rem 0 0' }}>{att.postAuthor} • {new Date(att.postDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        <button onClick={() => {
                          setDiscussionTab('chat');
                          setTimeout(() => {
                            const el = postRefs.current[att.postId];
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.style.transition = 'background 0.3s ease';
                              el.style.background = 'rgba(var(--color-primary) / 0.08)';
                              el.style.borderRadius = '12px';
                              setTimeout(() => { el.style.background = 'transparent'; }, 1500);
                            }
                          }, 100);
                        }} style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem',
                          padding: '0.2rem 0.45rem', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 600,
                          background: 'rgba(var(--color-primary) / 0.06)', color: 'rgb(var(--color-primary))',
                          border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--color-primary) / 0.12)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--color-primary) / 0.06)'; }}>
                          <MessagesSquare size={9} /> Lihat di Chat
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div onClick={() => setContextMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{ position: 'fixed', right: `calc(100vw - ${contextMenu.x}px)`, top: contextMenu.y, zIndex: 100, background: 'var(--modal-bg)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: '0.25rem 0', minWidth: 130 }}>
            {canPin && <button onClick={() => handleTogglePin(contextMenu.postId)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left' }}><Pin size={12} /> {posts.find((p) => p.id === contextMenu.postId)?.isPinned ? 'Unpin' : 'Pin'}</button>}
            <button onClick={() => { const p = posts.find((pp) => pp.id === contextMenu.postId); if (p) { setReplyToPost({ id: p.id, authorName: p.authorName, content: p.content.slice(0, 100) }); inputRef.current?.focus(); } setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left' }}><Reply size={12} /> Balas</button>
            <button onClick={() => { const p = posts.find((pp) => pp.id === contextMenu.postId); if (p) { navigator.clipboard.writeText(p.content.replace(/^\[reply:[^\]]*\]\n?/, '')); showToast('Pesan disalin.', 'success'); } setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontFamily: 'inherit', textAlign: 'left' }}>📋 Salin</button>
            <button onClick={() => handleDeletePost(contextMenu.postId)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--color-error))', fontFamily: 'inherit', textAlign: 'left' }}><Trash2 size={12} /> Hapus</button>
          </div>
        </>
      )}

      {/* Special Post Modal */}
      <Modal isOpen={showSpecialPost} onClose={() => setShowSpecialPost(false)} title={
        specialCategory === 'ANNOUNCEMENT' ? 'Buat Pengumuman' : specialCategory === 'QUESTION' ? 'Ajukan Pertanyaan'
        : specialCategory === 'POLL' ? 'Buat Voting' : 'Buat Pengingat'
      }>
        <form onSubmit={handleCreateSpecial} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <TextInput value={specialTitle} onChange={v => setSpecialTitle(v)} placeholder="Judul (opsional)" />
          <TextArea value={specialContent} onChange={setSpecialContent} placeholder="Konten..." required maxLength={5000} rows={3} />
          {specialCategory === 'POLL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 500 }}>Opsi Voting</label>
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.3rem' }}>
                  <TextInput value={opt} onChange={v => { const n = [...pollOptions]; n[i] = v; setPollOptions(n); }} placeholder={`Opsi ${i + 1}`} />
                  {pollOptions.length > 2 && <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-error))', padding: '0.2rem' }}><X size={12} /></button>}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPollOptions([...pollOptions, ''])} leftIcon={<Plus size={12} />}>Tambah Opsi</Button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--font-xs)', cursor: 'pointer', color: 'rgb(var(--text-secondary))' }}>
                  <input type="checkbox" checked={pollMultiple} onChange={(e) => setPollMultiple(e.target.checked)} style={{ accentColor: 'rgb(var(--color-primary))' }} />
                  Boleh pilih banyak (checkbox)
                </label>
              </div>
            </div>
          )}
          {specialCategory === 'REMINDER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <DatePicker
                    label="Tanggal"
                    value={remindAt.split('T')[0] || ''}
                    onChange={(v) => { const time = remindAt.split('T')[1] || '08:00'; setRemindAt(`${v}T${time}`); }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TimePicker
                    label="Waktu"
                    value={remindAt.split('T')[1] || ''}
                    onChange={(v) => { const date = remindAt.split('T')[0] || new Date().toISOString().split('T')[0]; setRemindAt(`${date}T${v}`); }}
                    required
                  />
                </div>
              </div>
              <div>
                <SelectOption label="Konteks" value={reminderContext} onChange={v => { setReminderContext(v as any); setReminderContextId(''); }} options={[
                  { value: 'general', label: 'Umum' },
                  { value: 'task', label: 'Tugas' },
                  { value: 'session', label: 'Pertemuan' },
                ]} />
              </div>
              {reminderContext === 'task' && tasks && tasks.length > 0 && (
                <div>
                  <SelectOption label="Pilih Tugas" value={reminderContextId} onChange={v => setReminderContextId(v)} options={[
                    { value: '', label: '-- Pilih Tugas --' },
                    ...tasks.map(t => ({ value: t.id, label: t.title })),
                  ]} />
                </div>
              )}
              {reminderContext === 'session' && sessions && sessions.length > 0 && (
                <div>
                  <SelectOption label="Pilih Pertemuan" value={reminderContextId} onChange={v => setReminderContextId(v)} options={[
                    { value: '', label: '-- Pilih Pertemuan --' },
                    ...sessions.map(s => ({ value: s.id, label: `Pertemuan ${s.sequence}: ${s.title}` })),
                  ]} />
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSpecialPost(false)}>Batal</Button>
            <Button type="submit" size="sm" isLoading={isCreatingSpecial} leftIcon={<Send size={12} />}>Kirim</Button>
          </div>
        </form>
      </Modal>

      {/* Create Discussion Modal */}
      <Modal isOpen={showCreateDiscussion} onClose={() => setShowCreateDiscussion(false)} title="Buat Pembahasan Baru" size="md">
        <form onSubmit={handleCreateDiscussion} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <TextInput label="Judul Pembahasan" value={newDiscTitle} onChange={v => setNewDiscTitle(v)} placeholder="Misal: Tugas Bab 3, Persiapan UTS" required autoFocus />
            <TextArea label="Deskripsi (Opsional)" value={newDiscDesc} onChange={setNewDiscDesc} placeholder="Konteks atau penjelasan..." maxLength={2000} rows={2} />
          <SelectOption label="Konteks Pembahasan" value={newDiscContext} onChange={v => { setNewDiscContext(v as any); setNewDiscTaskId(''); setNewDiscSessionId(''); }} options={[
            { value: 'general', label: 'Umum' },
            { value: 'task', label: 'Tugas' },
            { value: 'session', label: 'Pertemuan' },
          ]} />
          {newDiscContext === 'task' && tasks && tasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <SelectOption label="Pilih Tugas (Opsional)" value={newDiscTaskId} onChange={v => setNewDiscTaskId(v)} options={[
                { value: '', label: '-- Tidak perlu memilih tugas spesifik --' },
                ...tasks.map(t => ({ value: t.id, label: t.title })),
              ]} />
            </div>
          )}
          {newDiscContext === 'session' && sessions && sessions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <SelectOption label="Pilih Pertemuan (Opsional)" value={newDiscSessionId} onChange={v => setNewDiscSessionId(v)} options={[
                { value: '', label: '-- Tidak perlu memilih pertemuan spesifik --' },
                ...sessions.map(s => ({ value: s.id, label: `Pertemuan ${s.sequence}: ${s.title}` })),
              ]} />
            </div>
          )}
          {/* Member Assignment */}
          <SelectOption label="Akses Pembahasan" value={discAssignType} onChange={v => { setDiscAssignType(v as any); setDiscAssignedUserIds([]); setDiscAssignedGroupId(''); }} options={[
            { value: 'ALL', label: 'Semua Anggota' },
            { value: 'INDIVIDUAL', label: 'Pilih Anggota Manual' },
            { value: 'GROUP', label: 'Kelompok' },
          ]} />
          {discAssignType === 'INDIVIDUAL' && classMembers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>Pilih Anggota ({discAssignedUserIds.length} dipilih)</label>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
                {classMembers.filter(m => m.role !== 'OWNER').map((m) => (
                  <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.4rem', cursor: 'pointer', fontSize: 'var(--font-xs)', borderRadius: 'var(--radius-sm)', background: discAssignedUserIds.includes(m.userId) ? 'rgba(var(--color-primary) / 0.06)' : 'transparent' }}>
                    <input type="checkbox" checked={discAssignedUserIds.includes(m.userId)} onChange={() => setDiscAssignedUserIds(prev => prev.includes(m.userId) ? prev.filter(x => x !== m.userId) : [...prev, m.userId])} style={{ accentColor: 'rgb(var(--color-primary))' }} />
                    {m.user.fullName}
                  </label>
                ))}
              </div>
            </div>
          )}
          {discAssignType === 'GROUP' && discGroups.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <SelectOption label="Pilih Kelompok" value={discAssignedGroupId} onChange={v => setDiscAssignedGroupId(v)} options={[
                { value: '', label: '-- Pilih Kelompok --' },
                ...discGroups.map((g: any) => ({ value: g.id, label: `${g.name} (${g.members?.length || 0} anggota)` })),
              ]} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateDiscussion(false)}>Batal</Button>
            <Button type="submit" size="sm" isLoading={isCreatingDisc}>Buat</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Discussion Modal */}
      <Modal isOpen={!!editingDiscussion} onClose={() => setEditingDiscussion(null)} title="Edit Pembahasan" size="md">
        <form onSubmit={handleEditDiscussion} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <TextInput label="Judul Pembahasan" value={editDiscTitle} onChange={v => setEditDiscTitle(v)} required autoFocus />
            <TextArea label="Deskripsi" value={editDiscDesc} onChange={setEditDiscDesc} placeholder="Tambahkan deskripsi..." maxLength={2000} rows={3} />
          {/* Member Assignment */}
          <SelectOption label="Akses Pembahasan" value={editDiscAssignType} onChange={v => { setEditDiscAssignType(v as any); setEditDiscAssignedUserIds([]); setEditDiscAssignedGroupId(''); }} options={[
            { value: 'ALL', label: 'Semua Anggota' },
            { value: 'INDIVIDUAL', label: 'Pilih Anggota Manual' },
            { value: 'GROUP', label: 'Kelompok' },
          ]} />
          {editDiscAssignType === 'INDIVIDUAL' && classMembers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>Pilih Anggota ({editDiscAssignedUserIds.length} dipilih)</label>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
                {classMembers.filter(m => m.role !== 'OWNER').map((m) => (
                  <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.4rem', cursor: 'pointer', fontSize: 'var(--font-xs)', borderRadius: 'var(--radius-sm)', background: editDiscAssignedUserIds.includes(m.userId) ? 'rgba(var(--color-primary) / 0.06)' : 'transparent' }}>
                    <input type="checkbox" checked={editDiscAssignedUserIds.includes(m.userId)} onChange={() => setEditDiscAssignedUserIds(prev => prev.includes(m.userId) ? prev.filter(x => x !== m.userId) : [...prev, m.userId])} style={{ accentColor: 'rgb(var(--color-primary))' }} />
                    {m.user.fullName}
                  </label>
                ))}
              </div>
            </div>
          )}
          {editDiscAssignType === 'GROUP' && discGroups.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <SelectOption label="Pilih Kelompok" value={editDiscAssignedGroupId} onChange={v => setEditDiscAssignedGroupId(v)} options={[
                { value: '', label: '-- Pilih Kelompok --' },
                ...discGroups.map((g: any) => ({ value: g.id, label: `${g.name} (${g.members?.length || 0} anggota)` })),
              ]} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDiscussion(null)}>Batal</Button>
            <Button type="submit" size="sm" isLoading={isSavingDisc}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Member Profile Modal */}
      <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Profil Anggota">
        {selectedMember && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgb(var(--color-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
              {selectedMember.user.fullName.charAt(0)}
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, margin: 0 }}>{selectedMember.user.fullName}</h3>
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: '0.1rem 0' }}>{selectedMember.user.email}</p>
              <span style={{ display: 'inline-block', fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '999px', background: selectedMember.role === 'OWNER' ? 'rgba(var(--color-warning) / 0.1)' : 'rgba(var(--color-primary) / 0.1)', color: selectedMember.role === 'OWNER' ? 'rgb(var(--color-warning))' : 'rgb(var(--color-primary))', fontWeight: 600, marginTop: '0.25rem' }}>
                {selectedMember.role === 'OWNER' ? '👑 Pemilik' : '👤 Anggota'}
              </span>
            </div>
            <Button size="sm" onClick={() => setSelectedMember(null)}>Tutup</Button>
          </div>
        )}
      </Modal>

      {/* Image Preview Modal */}
      {previewImage && (
        <>
          <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
              <a href={previewImage} download style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                <Download size={16} />
              </a>
              <button onClick={() => setPreviewImage(null)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create tab modal */}
      <Modal isOpen={showCreateTabModal} onClose={() => setShowCreateTabModal(false)} title="Buat Canvas Baru">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateTab(); }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <TextInput label="Nama" value={newTabName} onChange={setNewTabName} placeholder="Contoh: Environment, Resources, Catatan..." autoFocus />
          <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Canvas berisi editor teks dan lampiran file. Semua anggota kelas bisa melihat dan mengedit.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="ghost" onClick={() => setShowCreateTabModal(false)}>Batal</Button>
            <Button type="submit" isLoading={creatingTab} disabled={!newTabName.trim()}>Buat</Button>
          </div>
        </form>
      </Modal>

      {/* Rename tab modal */}
      <Modal isOpen={!!renamingTabId} onClose={() => setRenamingTabId(null)} title="Rename Canvas">
        <form onSubmit={(e) => { e.preventDefault(); if (renamingTabId) handleRenameTab(renamingTabId); }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <TextInput label="Nama Baru" value={renameValue} onChange={setRenameValue} autoFocus />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="ghost" onClick={() => setRenamingTabId(null)}>Batal</Button>
            <Button type="submit" disabled={!renameValue.trim()}>Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
