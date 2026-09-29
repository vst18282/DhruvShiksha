import { markdownBlocks } from '@/lib/markdown';

/** Renders the CMS markdown subset without injecting raw HTML. */
export function MarkdownPreview({ md }: { md: string }) {
  const blocks = markdownBlocks(md);
  return (
    <div className="prose-polar">
      {blocks.map((b, i) =>
        b.kind === 'h2' ? <h2 key={i}>{b.text}</h2> : b.kind === 'h3' ? <h3 key={i}>{b.text}</h3> : b.kind === 'li' ? <ul key={i}><li>{b.text}</li></ul> : b.kind === 'quote' ? <blockquote key={i}>{b.text}</blockquote> : <p key={i}>{b.text}</p>,
      )}
    </div>
  );
}
