import { describe, it, expect } from 'vitest';
import {
  parseBriefingSections,
  buildTaskDeepLink,
  buildTodoDeepLink,
} from './briefing-parser';

describe('parseBriefingSections', () => {
  it('parses a full briefing with all section markers', () => {
    const content = `
<!-- SECTION:greeting -->
Selamat pagi, Zinedine!

<!-- SECTION:tugas -->
- Laporan Praktikum Fisika — deadline 12 Juni
- Essay Filsafat Ilmu — deadline 14 Juni

<!-- SECTION:todo -->
- Beli buku Struktur Data — hari ini
- Bayar uang kos — besok

<!-- SECTION:keuangan -->
- Makan Siang: Rp25.000
- Grab ke Kampus: Rp15.000
- Kopi: Rp20.000

<!-- SECTION:kelas -->
- Kalkulus II: "Integral Lipat Dua" — 08:00, Ruang A301

<!-- SECTION:tabungan -->
- Tabungan Laptop: 65% (Rp6.500.000 / Rp10.000.000)

<!-- SECTION:motivasi -->
Kamu sudah 65% menuju laptop baru, semangat!
    `.trim();

    const sections = parseBriefingSections(content);

    expect(sections).toHaveLength(7);
    expect(sections[0].type).toBe('greeting');
    expect(sections[0].icon).toBe('👋');
    expect(sections[0].items[0].text).toBe('Selamat pagi, Zinedine!');

    expect(sections[1].type).toBe('tugas');
    expect(sections[1].icon).toBe('📝');
    expect(sections[1].title).toBe('Tugas Kelas');
    expect(sections[1].items).toHaveLength(2);
    expect(sections[1].items[0].text).toBe('Laporan Praktikum Fisika — deadline 12 Juni');
    expect(sections[1].items[0].link).toBe('/dashboard');
    expect(sections[1].items[0].metadata).toBe('tugas');

    expect(sections[2].type).toBe('todo');
    expect(sections[2].icon).toBe('✅');
    expect(sections[2].title).toBe('To-Do');
    expect(sections[2].items).toHaveLength(2);
    expect(sections[2].items[0].link).toBe('/todos');
    expect(sections[2].items[0].metadata).toBe('todo');

    expect(sections[3].type).toBe('keuangan');
    expect(sections[3].icon).toBe('💰');
    expect(sections[3].title).toBe('Keuangan');
    expect(sections[3].items).toHaveLength(3);
    expect(sections[3].items[0].link).toBeUndefined();

    expect(sections[4].type).toBe('kelas');
    expect(sections[4].icon).toBe('📚');

    expect(sections[5].type).toBe('tabungan');
    expect(sections[5].icon).toBe('🌳');

    expect(sections[6].type).toBe('motivasi');
    expect(sections[6].icon).toBe('💬');
  });

  it('returns empty array for empty or null content', () => {
    expect(parseBriefingSections('')).toEqual([]);
    expect(parseBriefingSections(null as any)).toEqual([]);
    expect(parseBriefingSections(undefined as any)).toEqual([]);
  });

  it('returns empty array for content without section markers', () => {
    const content = 'Just some plain text without any markers.';
    expect(parseBriefingSections(content)).toEqual([]);
  });

  it('handles sections with missing data gracefully (skips empty sections)', () => {
    const content = `
<!-- SECTION:greeting -->
Halo!

<!-- SECTION:tugas -->

<!-- SECTION:motivasi -->
Semangat!
    `.trim();

    const sections = parseBriefingSections(content);
    // Empty tugas section is skipped since rawContent is empty
    expect(sections.some(s => s.type === 'greeting')).toBe(true);
    expect(sections.some(s => s.type === 'motivasi')).toBe(true);
  });

  it('strips markdown bold markers from item text', () => {
    const content = `
<!-- SECTION:tugas -->
- **Laporan Praktikum** — deadline 12 Juni
    `.trim();

    const sections = parseBriefingSections(content);
    expect(sections[0].items[0].text).toBe('Laporan Praktikum — deadline 12 Juni');
  });

  it('handles numbered lists', () => {
    const content = `
<!-- SECTION:keuangan -->
1. Makan Siang: Rp25.000
2. Transport: Rp15.000
    `.trim();

    const sections = parseBriefingSections(content);
    expect(sections[0].items[0].text).toBe('Makan Siang: Rp25.000');
    expect(sections[0].items[1].text).toBe('Transport: Rp15.000');
  });

  it('ignores unknown section types', () => {
    const content = `
<!-- SECTION:unknown_type -->
Some content

<!-- SECTION:tugas -->
- A task
    `.trim();

    const sections = parseBriefingSections(content);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('tugas');
  });
});

describe('buildTaskDeepLink', () => {
  it('returns specific class task link when matching deadline found', () => {
    const deadlines = [
      { id: 'task-1', title: 'Laporan Praktikum Fisika', className: 'Fisika', classId: 'class-1' },
      { id: 'task-2', title: 'Essay Filsafat', className: 'Filsafat', classId: 'class-2' },
    ];

    const link = buildTaskDeepLink('Laporan Praktikum Fisika — deadline 12 Juni', deadlines);
    expect(link).toBe('/class/class-1?tab=tugas&taskId=task-1');
  });

  it('returns /dashboard when no match found', () => {
    const deadlines = [
      { id: 'task-1', title: 'Some Other Task', className: 'Other', classId: 'class-1' },
    ];

    const link = buildTaskDeepLink('Completely unrelated text', deadlines);
    expect(link).toBe('/dashboard');
  });

  it('returns /dashboard when deadlines is empty', () => {
    expect(buildTaskDeepLink('Some task', [])).toBe('/dashboard');
    expect(buildTaskDeepLink('Some task', undefined)).toBe('/dashboard');
  });
});

describe('buildTodoDeepLink', () => {
  it('returns specific todo link when matching todo found', () => {
    const todos = [
      { id: 'todo-1', title: 'Beli buku Struktur Data' },
      { id: 'todo-2', title: 'Bayar uang kos' },
    ];

    const link = buildTodoDeepLink('Beli buku Struktur Data — hari ini', todos);
    expect(link).toBe('/todos?highlight=todo-1');
  });

  it('returns /todos when no match found', () => {
    const todos = [{ id: 'todo-1', title: 'Completely different' }];
    const link = buildTodoDeepLink('Unrelated text that is long enough', todos);
    expect(link).toBe('/todos');
  });

  it('returns /todos when todos is empty', () => {
    expect(buildTodoDeepLink('Some todo', [])).toBe('/todos');
    expect(buildTodoDeepLink('Some todo', undefined)).toBe('/todos');
  });
});
