/**
 * Briefing Parser — Parses markdown section markers from backend AI briefing content.
 * The backend structures output with `<!-- SECTION:type -->` markers.
 *
 * Supported section types: greeting, tugas, todo, keuangan, kelas, tabungan, motivasi
 */

export type BriefingSectionType =
  | 'greeting'
  | 'tugas'
  | 'todo'
  | 'keuangan'
  | 'kelas'
  | 'tabungan'
  | 'motivasi';

export interface BriefingItem {
  text: string;
  link?: string; // Deep link for tappable items
  metadata?: string;
}

export interface BriefingSection {
  type: BriefingSectionType;
  icon: string;
  title: string;
  items: BriefingItem[];
  rawContent: string;
}

/** Icon mapping for each section type */
const SECTION_ICONS: Record<BriefingSectionType, string> = {
  greeting: '👋',
  tugas: '📝',
  todo: '✅',
  keuangan: '💰',
  kelas: '📚',
  tabungan: '🌳',
  motivasi: '💬',
};

/** Display title mapping for each section type */
const SECTION_TITLES: Record<BriefingSectionType, string> = {
  greeting: 'Sapaan',
  tugas: 'Tugas Kelas',
  todo: 'To-Do',
  keuangan: 'Keuangan',
  kelas: 'Jadwal Kelas',
  tabungan: 'Tabungan',
  motivasi: 'Motivasi',
};

const VALID_SECTION_TYPES: BriefingSectionType[] = [
  'greeting', 'tugas', 'todo', 'keuangan', 'kelas', 'tabungan', 'motivasi',
];

/**
 * Parse markdown content with section markers into structured sections.
 * Input format:
 * ```
 * <!-- SECTION:greeting -->
 * content...
 *
 * <!-- SECTION:tugas -->
 * content...
 * ```
 */
export function parseBriefingSections(content: string): BriefingSection[] {
  if (!content || typeof content !== 'string') return [];

  const sections: BriefingSection[] = [];
  // Match section markers: <!-- SECTION:type -->
  const sectionRegex = /<!--\s*SECTION:(\w+)\s*-->/gi;
  const markers: { type: string; index: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(content)) !== null) {
    markers.push({ type: match[1].toLowerCase(), index: match.index + match[0].length });
  }

  if (markers.length === 0) return [];

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const type = marker.type as BriefingSectionType;

    if (!VALID_SECTION_TYPES.includes(type)) continue;

    // Extract content between this marker and the next (or end of string)
    const start = marker.index;
    const end = i + 1 < markers.length
      ? content.lastIndexOf('<!--', markers[i + 1].index)
      : content.length;
    const rawContent = content.slice(start, end).trim();

    if (!rawContent) continue;

    const items = parseItemsFromContent(rawContent, type);

    sections.push({
      type,
      icon: SECTION_ICONS[type],
      title: SECTION_TITLES[type],
      items,
      rawContent,
    });
  }

  return sections;
}

/**
 * Parse individual items from section content.
 * Items are separated by newlines. List markers (-, *, •) are stripped.
 * For tugas/todo sections, deep links are generated.
 */
function parseItemsFromContent(content: string, type: BriefingSectionType): BriefingItem[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines.map(line => {
    // Strip markdown list markers
    const text = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');

    // Strip bold markers for clean text display but keep semantic meaning
    const cleanText = text.replace(/\*\*/g, '');

    const item: BriefingItem = { text: cleanText };

    // Generate deep links for tugas and todo items
    if (type === 'tugas') {
      item.link = '/dashboard'; // Tasks are viewed via class page; link to dashboard for overview
      item.metadata = 'tugas';
    } else if (type === 'todo') {
      item.link = '/todos';
      item.metadata = 'todo';
    }

    return item;
  });
}

/**
 * Extract deep link for a task item based on available dashboard data.
 * If deadline data includes classId and taskId, build a specific deep link.
 */
export function buildTaskDeepLink(
  itemText: string,
  deadlines?: { id: string; title: string; className?: string; classId?: string }[],
): string {
  if (!deadlines || deadlines.length === 0) return '/dashboard';

  // Try to fuzzy-match the item text to a deadline
  const normalizedText = itemText.toLowerCase();
  const matched = deadlines.find(d =>
    normalizedText.includes(d.title.toLowerCase()) ||
    d.title.toLowerCase().includes(normalizedText.substring(0, 20))
  );

  if (matched && (matched as any).classId) {
    return `/class/${(matched as any).classId}?tab=tugas&taskId=${matched.id}`;
  }

  return '/dashboard';
}

/**
 * Extract deep link for a todo item based on available dashboard data.
 */
export function buildTodoDeepLink(
  itemText: string,
  todos?: { id: string; title: string }[],
): string {
  if (!todos || todos.length === 0) return '/todos';

  // Try to fuzzy-match the item text to a todo
  const normalizedText = itemText.toLowerCase();
  const matched = todos.find(t =>
    normalizedText.includes(t.title.toLowerCase()) ||
    t.title.toLowerCase().includes(normalizedText.substring(0, 20))
  );

  if (matched) {
    return `/todos?highlight=${matched.id}`;
  }

  return '/todos';
}
