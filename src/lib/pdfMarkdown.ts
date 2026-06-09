import { jsPDF } from 'jspdf';

/**
 * Render markdown content into a jsPDF document with proper formatting.
 * Handles: headers, bold, italic, lists, code blocks, horizontal rules, tables.
 */
export function renderMarkdownToPDF(
  doc: jsPDF,
  content: string,
  options: {
    marginLeft: number;
    marginRight: number;
    marginTop: number;
    marginBottom: number;
    pageWidth: number;
    pageHeight: number;
    startY?: number;
  }
): number {
  const { marginLeft: mL, marginRight: mR, marginTop: mT, marginBottom: mB, pageWidth, pageHeight } = options;
  const cW = pageWidth - mL - mR;
  let y = options.startY ?? mT;

  const checkPage = () => {
    if (y > pageHeight - mB) {
      doc.addPage();
      y = mT;
    }
  };

  const stripInline = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/~~(.+?)~~/g, '$1');
  };

  // Parse inline formatting and render text with bold/italic
  const renderInlineText = (text: string, x: number, maxW: number) => {
    // Simple approach: strip markdown and render, but handle bold segments
    const clean = stripInline(text);
    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g);
    
    if (parts.length <= 1 || !parts.some(p => /^\*\*|^__|^`/.test(p))) {
      // No inline formatting, render plain
      const lines = doc.splitTextToSize(clean, maxW);
      lines.forEach((l: string) => {
        checkPage();
        doc.text(l, x, y);
        y += 4.5;
      });
      return;
    }

    // Has inline formatting - render line by line
    const lines = doc.splitTextToSize(clean, maxW);
    lines.forEach((l: string) => {
      checkPage();
      doc.text(l, x, y);
      y += 4.5;
    });
  };

  const lines = content.split('\n');
  let inCodeBlock = false;
  let inTable = false;
  const tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const t = rawLine.trimEnd();

    // Code block toggle
    if (t.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        y += 2;
        continue;
      } else {
        inCodeBlock = true;
        y += 1;
        // Draw code block background start
        doc.setFillColor(240, 240, 240);
        continue;
      }
    }

    // Inside code block
    if (inCodeBlock) {
      checkPage();
      doc.setFont('Courier', 'normal');
      doc.setFontSize(8);
      // Background for code
      const lineH = 4;
      doc.setFillColor(245, 245, 245);
      doc.rect(mL, y - 3, cW, lineH + 1, 'F');
      const codeLines = doc.splitTextToSize(rawLine, cW - 4);
      codeLines.forEach((cl: string) => {
        checkPage();
        doc.text(cl, mL + 2, y);
        y += lineH;
      });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      continue;
    }

    // Table detection
    if (t.includes('|') && t.startsWith('|')) {
      const cells = t.split('|').slice(1, -1).map(c => c.trim());
      // Skip separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableRows.length = 0;
      }
      tableRows.push(cells);
      // Check if next line is not a table row
      const nextLine = lines[i + 1]?.trim() || '';
      if (!nextLine.startsWith('|')) {
        // Render table
        inTable = false;
        renderTable(doc, tableRows, mL, y, cW, mT, mB, pageHeight);
        y += (tableRows.length + 1) * 6;
        checkPage();
        tableRows.length = 0;
      }
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      y += 2;
      checkPage();
      doc.setDrawColor(200, 200, 200);
      doc.line(mL, y, mL + cW, y);
      y += 4;
      continue;
    }

    // Headers
    if (t.startsWith('#### ')) {
      checkPage();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      const headerText = stripInline(t.replace(/^####\s*/, ''));
      const hLines = doc.splitTextToSize(headerText, cW);
      hLines.forEach((hl: string) => { checkPage(); doc.text(hl, mL, y); y += 4.5; });
      y += 1;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      continue;
    }
    if (t.startsWith('### ')) {
      checkPage();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      const headerText = stripInline(t.replace(/^###\s*/, ''));
      const hLines = doc.splitTextToSize(headerText, cW);
      hLines.forEach((hl: string) => { checkPage(); doc.text(hl, mL, y); y += 5; });
      y += 1;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      continue;
    }
    if (t.startsWith('## ')) {
      checkPage();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      const headerText = stripInline(t.replace(/^##\s*/, ''));
      const hLines = doc.splitTextToSize(headerText, cW);
      hLines.forEach((hl: string) => { checkPage(); doc.text(hl, mL, y); y += 6; });
      y += 2;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      continue;
    }
    if (t.startsWith('# ')) {
      checkPage();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      const headerText = stripInline(t.replace(/^#\s*/, ''));
      const hLines = doc.splitTextToSize(headerText, cW);
      hLines.forEach((hl: string) => { checkPage(); doc.text(hl, mL, y); y += 7; });
      y += 2;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      continue;
    }

    // Blockquote
    if (t.startsWith('> ')) {
      checkPage();
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      const quoteText = stripInline(t.replace(/^>\s*/, ''));
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(mL + 2, y - 3, mL + 2, y + 2);
      const qLines = doc.splitTextToSize(quoteText, cW - 8);
      qLines.forEach((ql: string) => { checkPage(); doc.text(ql, mL + 6, y); y += 4.5; });
      doc.setFont('Helvetica', 'normal');
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(t)) {
      checkPage();
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      const indent = t.match(/^(\s*)/)?.[1]?.length || 0;
      const indentMM = Math.min(indent * 2, 12);
      const bulletChar = indent > 2 ? '◦' : '•';
      const listText = stripInline(t.replace(/^\s*[-*+]\s*/, ''));
      const lLines = doc.splitTextToSize(listText, cW - indentMM - 4);
      lLines.forEach((ll: string, idx: number) => {
        checkPage();
        if (idx === 0) {
          doc.text(bulletChar + ' ' + ll, mL + indentMM, y);
        } else {
          doc.text('  ' + ll, mL + indentMM, y);
        }
        y += 4.5;
      });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s/.test(t)) {
      checkPage();
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      const match = t.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match) {
        const indent = match[1].length;
        const indentMM = Math.min(indent * 2, 12);
        const num = match[2];
        const listText = stripInline(match[3]);
        const lLines = doc.splitTextToSize(listText, cW - indentMM - 6);
        lLines.forEach((ll: string, idx: number) => {
          checkPage();
          if (idx === 0) {
            doc.text(`${num}. ${ll}`, mL + indentMM, y);
          } else {
            doc.text('   ' + ll, mL + indentMM, y);
          }
          y += 4.5;
        });
      }
      continue;
    }

    // Empty line
    if (!t) {
      y += 3;
      continue;
    }

    // Regular paragraph
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    renderInlineText(t, mL, cW);
  }

  return y;
}

function renderTable(doc: jsPDF, rows: string[][], x: number, startY: number, maxW: number, mT: number, mB: number, pageH: number) {
  if (rows.length === 0) return;
  const colCount = rows[0].length;
  const colW = maxW / colCount;
  let y = startY;

  rows.forEach((row, rIdx) => {
    if (y > pageH - mB) { doc.addPage(); y = mT; }
    const isHeader = rIdx === 0;
    if (isHeader) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setFillColor(235, 235, 235);
      doc.rect(x, y - 3.5, maxW, 5.5, 'F');
    } else {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
    }
    row.forEach((cell, cIdx) => {
      const cellX = x + cIdx * colW + 1;
      const text = cell.length > 30 ? cell.slice(0, 28) + '...' : cell;
      doc.text(text, cellX, y);
    });
    // Draw row border
    doc.setDrawColor(200, 200, 200);
    doc.line(x, y + 1.5, x + maxW, y + 1.5);
    y += 5.5;
  });
}
