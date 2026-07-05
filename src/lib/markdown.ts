// Minimal inline markdown -> HTML (bold, links, code). Abstracts are single paragraphs, no need for
// a full parser. No single-asterisk italics: math abstracts use "*" for multiplication, which would
// otherwise get misread as emphasis markers.
export function renderInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
