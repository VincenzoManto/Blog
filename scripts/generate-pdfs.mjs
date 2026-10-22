// Generates an indexable, citable preprint PDF for every article whose frontmatter
// declares a `doi`. Runs as part of `npm run build` (after `astro build`), using
// pdfkit directly (no headless browser) so it has no network/runtime dependency
// beyond Node itself. Output: dist/preprints/<slug>.pdf
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'src', 'pages', 'articles');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'dist', 'preprints');
const SITE_URL = (process.env.SITE_URL || 'https://vincenzomanto.github.io').replace(/\/$/, '');
const BASE = '/Blog/';

const PAGE = { size: 'A4', margins: { top: 80, bottom: 70, left: 72, right: 72 } };
const FONT = { serif: 'Times-Roman', serifBold: 'Times-Bold', serifItalic: 'Times-Italic', mono: 'Courier' };

function slugFor(file) {
  return path.basename(file, path.extname(file));
}

function extractDoiId(doi) {
  const m = String(doi).match(/doi\.org\/(.+)$/);
  return m ? m[1] : String(doi);
}

function listArticlesWithDoi() {
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf-8');
      const { data, content } = matter(raw);
      return { file: f, slug: slugFor(f), frontmatter: data, body: content };
    })
    .filter((a) => !!a.frontmatter.doi);
}

// ---- Minimal Markdown/MDX -> PDF block renderer ---------------------------------
// Scope: headings, paragraphs, bold/italic/code/links/inline-math (as text),
// bullet & numbered lists, blockquotes, fenced code blocks, pipe tables,
// horizontal rules, block math ($$...$$), and <img src="..." /> figures.

function stripUnsupportedJsx(body) {
  return body
    .split('\n')
    .filter((l) => !/^\s*(import|export)\s/.test(l))
    .join('\n');
}

function renderInline(doc, text, opts = {}) {
  const { font = FONT.serif, size = 11, color = '#111', width, align } = opts;
  doc.font(font).fontSize(size).fillColor(color);
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*|\$[^$]+\$)/g).filter(Boolean);
  const chunks = tokens.map((t) => {
    if (/^\*\*[^*]+\*\*$/.test(t)) return { text: t.slice(2, -2), font: FONT.serifBold };
    if (/^`[^`]+`$/.test(t)) return { text: t.slice(1, -1), font: FONT.mono, size: size - 0.5 };
    if (/^\$[^$]+\$$/.test(t)) return { text: t.slice(1, -1), font: FONT.serifItalic };
    const link = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return { text: link[1], link: link[2], underline: true, color: '#1a4fa0' };
    if (/^\*[^*]+\*$/.test(t)) return { text: t.slice(1, -1), font: FONT.serifItalic };
    return { text: t };
  });
  // `width`/`align` must be passed on EVERY call of a continued chain: pdfkit's
  // wrapper is seeded from the first call's raw options object and later calls
  // only fill in keys that are still undefined, so a narrow width set once
  // (e.g. for a list marker) would otherwise leak into — and mangle — every
  // following chunk in the same chain.
  chunks.forEach((c, i) => {
    doc
      .font(c.font || font)
      .fontSize(c.size || size)
      .fillColor(c.color || color)
      .text(c.text, {
        continued: i < chunks.length - 1,
        link: c.link,
        underline: !!c.underline,
        width,
        align,
      });
  });
  doc.fillColor('#111');
}

const LIST_INDENT = 18;

function renderListItem(doc, marker, text, indent = LIST_INDENT) {
  ensureSpace(doc, 16);
  doc.x = doc.page.margins.left;
  const contentX = doc.page.margins.left + indent;
  const contentWidth = doc.page.width - doc.page.margins.right - contentX;
  const y = doc.y;
  // Marker drawn as a standalone, non-wrapped line (lineBreak:false skips the
  // wrapper entirely, so it cannot seed/pollute the content's text options).
  doc.font(FONT.serif).fontSize(11).fillColor('#111').text(marker, doc.page.margins.left, y, { lineBreak: false });
  doc.x = contentX;
  doc.y = y;
  renderInline(doc, text, { width: contentWidth });
  doc.x = doc.page.margins.left;
  doc.moveDown(0.25);
}

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function renderBody(doc, rawBody, slug) {
  const lines = stripUnsupportedJsx(rawBody).split('\n');
  let i = 0;
  let listOrdinal = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      doc.moveDown(0.4);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      ensureSpace(doc, 20);
      const y = doc.y + 6;
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .strokeColor('#999')
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(1);
      i++;
      continue;
    }

    // Fenced code block
    if (/^\s*```/.test(line)) {
      const codeLines = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const text = codeLines.join('\n');
      ensureSpace(doc, 24);
      const padding = 8;
      doc.font(FONT.mono).fontSize(8.5);
      const h = doc.heightOfString(text, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right - padding * 2 }) + padding * 2;
      ensureSpace(doc, h);
      const boxY = doc.y;
      doc
        .rect(doc.page.margins.left, boxY, doc.page.width - doc.page.margins.left - doc.page.margins.right, h)
        .fillAndStroke('#f4f4f4', '#ccc');
      doc
        .fillColor('#222')
        .font(FONT.mono)
        .fontSize(8.5)
        .text(text, doc.page.margins.left + padding, boxY + padding, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right - padding * 2,
        });
      doc.y = boxY + h;
      doc.fillColor('#111');
      doc.moveDown(0.8);
      continue;
    }

    // Block math $$...$$
    if (/^\s*\$\$/.test(line)) {
      const mathLines = [];
      let content = line.trim().slice(2);
      i++;
      if (!/\$\$\s*$/.test(content)) {
        while (i < lines.length && !/\$\$\s*$/.test(lines[i])) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) mathLines.push(lines[i].replace(/\$\$\s*$/, ''));
        i++;
      } else {
        content = content.replace(/\$\$\s*$/, '');
        mathLines.push(content);
      }
      const formula = mathLines.join(' ').trim();
      ensureSpace(doc, 24);
      doc.font(FONT.serifItalic).fontSize(11.5).text(formula, {
        align: 'center',
      });
      doc.font(FONT.serif);
      doc.moveDown(0.6);
      continue;
    }

    // Image (JSX <img ... />)
    const imgMatch = line.match(/<img\s+src="([^"]+)"\s+alt="([^"]*)"\s*\/?>/);
    if (imgMatch) {
      let [, src, alt] = imgMatch;
      const relative = src.startsWith(BASE) ? src.slice(BASE.length) : src.replace(/^\//, '');
      const abs = path.join(PUBLIC_DIR, relative);
      ensureSpace(doc, 180);
      if (fs.existsSync(abs)) {
        try {
          const maxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          doc.image(abs, { fit: [Math.min(maxWidth, 320), 260], align: 'center' });
          doc.moveDown(0.3);
        } catch {
          // fall through to caption-only
        }
      }
      doc.font(FONT.serifItalic).fontSize(9.5).fillColor('#444').text(alt ? `Figure: ${alt}` : 'Figure', { align: 'center' });
      doc.fillColor('#111').font(FONT.serif);
      doc.moveDown(0.8);
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = { 1: 18, 2: 15, 3: 13, 4: 11.5 };
      ensureSpace(doc, sizes[level] + 14);
      doc.x = doc.page.margins.left;
      doc.moveDown(level <= 2 ? 0.9 : 0.6);
      doc.font(FONT.serifBold).fontSize(sizes[level]).fillColor('#111').text(h[2].replace(/[`*]/g, ''));
      doc.moveDown(0.3);
      i++;
      listOrdinal = 0;
      continue;
    }

    // Pipe table
    if (/^\s*\|/.test(line) && lines[i + 1] && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = line.split('|').map((c) => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].split('|').map((c) => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
        rows.push(cells);
        i++;
      }
      renderTable(doc, header, rows);
      doc.moveDown(0.6);
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      ensureSpace(doc, 24);
      const x = doc.page.margins.left;
      const barY0 = doc.y;
      doc.font(FONT.serifItalic).fontSize(11).fillColor('#333');
      doc.text(quoteLines.join(' '), x + 14, doc.y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 14,
      });
      const barY1 = doc.y;
      doc.moveTo(x + 4, barY0).lineTo(x + 4, barY1).strokeColor('#bbb').lineWidth(2).stroke();
      doc.fillColor('#111').font(FONT.serif);
      doc.moveDown(0.6);
      continue;
    }

    // Numbered list
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      listOrdinal++;
      renderListItem(doc, `${listOrdinal}.`, ol[1]);
      i++;
      continue;
    }

    // Bullet list
    const ul = line.match(/^\s*[*-]\s+(.*)$/);
    if (ul) {
      renderListItem(doc, '•', ul[1]);
      i++;
      continue;
    }

    // Default paragraph: accumulate contiguous non-empty, non-special lines
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4})\s|^\s*```|^\s*\|.*\||^\s*---+\s*$|^\s*>\s?|^\s*[*-]\s|^\s*\d+\.\s|^\s*\$\$|<img\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    ensureSpace(doc, 16);
    doc.x = doc.page.margins.left;
    renderInline(doc, paraLines.join(' '), { align: 'justify' });
    doc.moveDown(0.6);
    listOrdinal = 0;
  }
}

function renderTable(doc, header, rows) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colCount = header.length;
  const colWidth = width / colCount;
  ensureSpace(doc, 22);

  function drawRow(cells, bold) {
    const startY = doc.y;
    const heights = cells.map((c) =>
      doc.font(bold ? FONT.serifBold : FONT.serif).fontSize(9.5).heightOfString(c, { width: colWidth - 8 })
    );
    const rowH = Math.max(...heights, 14) + 8;
    ensureSpace(doc, rowH);
    const y = doc.y;
    cells.forEach((c, idx) => {
      doc
        .font(bold ? FONT.serifBold : FONT.serif)
        .fontSize(9.5)
        .fillColor('#111')
        .text(c, left + idx * colWidth + 4, y + 4, { width: colWidth - 8 });
    });
    doc
      .rect(left, y, width, rowH)
      .strokeColor('#ccc')
      .lineWidth(0.5)
      .stroke();
    for (let c = 1; c < colCount; c++) {
      doc.moveTo(left + c * colWidth, y).lineTo(left + c * colWidth, y + rowH).strokeColor('#ccc').lineWidth(0.5).stroke();
    }
    doc.y = y + rowH;
  }

  drawRow(header, true);
  rows.forEach((r) => drawRow(r, false));
}

function addRunningHeader(doc, title, doiId) {
  doc.on('pageAdded', () => {
    // header/footer added post-hoc via buffered pages below
  });
}

function truncateToWidth(doc, text, maxWidth) {
  if (doc.widthOfString(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && doc.widthOfString(`${out}…`) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function drawHeaderFooter(doc, title, doiId) {
  const pages = doc.bufferedPageRange();
  const { count } = pages;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  for (let p = pages.start; p < pages.start + count; p++) {
    doc.switchToPage(p);
    const top = 30;
    const bottom = doc.page.height - 45;
    // Passing an explicit `width` to text() makes pdfkit create a LineWrapper,
    // and that wrapper checks the y position against the page's content area
    // on construction: at these margin y-positions (above/below the normal
    // flow) it decides the text "overflows" and calls continueOnNewPage(),
    // appending one blank trailing page per existing page in the loop. So
    // every call here avoids `width` entirely and does its own measuring/
    // truncation/right-alignment instead, taking pdfkit's unwrapped text path.
    // `lineBreak: false` is also required (not just omitting `width`): with no
    // options at all, `_initOptions` still fills in a default `width` on its
    // own, which is exactly what re-engages the wrapper/pagination check.
    doc.font(FONT.serif).fontSize(8).fillColor('#888');
    doc.text(truncateToWidth(doc, title, right - left), left, top, { lineBreak: false });

    const footerLeft = `preprint · doi:${doiId}`;
    doc.text(footerLeft, left, bottom, { lineBreak: false });

    const pageLabel = `${p - pages.start + 1} / ${count}`;
    const pageLabelWidth = doc.widthOfString(pageLabel);
    doc.text(pageLabel, right - pageLabelWidth, bottom, { lineBreak: false });

    doc.fillColor('#111');
  }
}

function generatePdf(article) {
  const { frontmatter: fm, body, slug } = article;
  const doiId = extractDoiId(fm.doi);
  const authors = String(fm.author || 'Vincenzo Manto');
  const dateStr = fm.date ? new Date(fm.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const keywords = Array.isArray(fm.keywords) ? fm.keywords.join(', ') : '';

  const doc = new PDFDocument({
    ...PAGE,
    autoFirstPage: true,
    bufferPages: true,
    info: {
      Title: fm.title,
      Author: authors,
      Subject: fm.abstract || '',
      Keywords: keywords,
      Creator: 'vincenzomanto.github.io preprint pipeline',
    },
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${slug}.pdf`);
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // --- Title page / masthead ---
  doc.font(FONT.serif).fontSize(9).fillColor('#555').text('PREPRINT', { align: 'center', characterSpacing: 2 });
  doc.moveDown(1.2);
  doc.font(FONT.serifBold).fontSize(20).fillColor('#111').text(fm.title, { align: 'center' });
  doc.moveDown(0.6);
  doc.font(FONT.serif).fontSize(11.5).fillColor('#333').text(authors, { align: 'center' });
  doc.moveDown(0.2);
  doc.font(FONT.serif).fontSize(10).fillColor('#555').text(dateStr, { align: 'center' });
  doc.moveDown(0.4);
  doc
    .font(FONT.serif)
    .fontSize(9.5)
    .fillColor('#555')
    .text(`DOI: https://doi.org/${doiId}`, { align: 'center', link: `https://doi.org/${doiId}` });
  if (fm.link) {
    doc.moveDown(0.1);
    doc.font(FONT.serif).fontSize(9).fillColor('#555').text(fm.link, { align: 'center', link: fm.link });
  }
  doc.moveDown(1);

  if (fm.abstract) {
    const boxTop = doc.y;
    const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.font(FONT.serifBold).fontSize(10.5).text('Abstract', doc.page.margins.left, boxTop, { width: boxWidth });
    doc.moveDown(0.3);
    doc.font(FONT.serif).fontSize(10.5).fillColor('#222').text(fm.abstract, { width: boxWidth, align: 'justify' });
    doc.fillColor('#111');
    doc.moveDown(0.6);
    const boxBottom = doc.y;
    doc
      .rect(doc.page.margins.left - 10, boxTop - 10, boxWidth + 20, boxBottom - boxTop + 14)
      .strokeColor('#ccc')
      .lineWidth(0.7)
      .stroke();
    doc.y = boxBottom + 18;
  }

  if (keywords) {
    doc.font(FONT.serifItalic).fontSize(9.5).fillColor('#555').text(`Keywords: ${keywords}`);
    doc.fillColor('#111');
    doc.moveDown(1);
  }

  doc.moveDown(0.5);

  renderBody(doc, body, slug);

  drawHeaderFooter(doc, fm.title, doiId);
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outPath));
    stream.on('error', reject);
  });
}

async function main() {
  const articles = listArticlesWithDoi();
  if (articles.length === 0) {
    console.log('[generate-pdfs] No articles with a DOI found, skipping.');
    return;
  }
  for (const article of articles) {
    const outPath = await generatePdf(article);
    console.log(`[generate-pdfs] Generated ${path.relative(ROOT, outPath)}`);
  }
  console.log(`[generate-pdfs] Done: ${articles.length} preprint PDF(s).`);
}

main().catch((err) => {
  console.error('[generate-pdfs] Failed:', err);
  process.exit(1);
});
