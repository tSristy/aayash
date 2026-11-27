'use client';
import { useEffect, useRef, useState } from 'react';
import { I } from './kit';

const TOOLS = [
  ['bold', 'Bold', 'B', 'font-bold'], ['italic', 'Italic', 'I', 'italic'], ['underline', 'Underline', 'U', 'underline'], '|',
  ['h1', 'Main heading', 'H1'], ['h2', 'Heading', 'H2'], ['h3', 'Sub-heading', 'H3'], ['p', 'Normal text (remove heading)', '¶'], '|',
  ['ul', 'Bullet list', '•'], ['ol', 'Numbered list', '1.'], ['quote', 'Quote', '❝'], '|',
  ['left', 'Align left', '⇤'], ['center', 'Centre', '↔'], '|',
  ['link', 'Add link', '🔗'], ['unlink', 'Remove link', '⛓'], ['clear', 'Clear formatting', '✕'],
];

/** Small WYSIWYG editor. Value in/out is HTML. "HTML" toggle edits the source directly. */
export default function RichText({ label, value, onChange, help, minHeight = 260 }) {
  const ref = useRef(null);
  const [source, setSource] = useState(false);
  const last = useRef(null);
  // Only push external changes into the editor (typing must not reset the caret).
  useEffect(() => { if (ref.current && value !== last.current && !source) { ref.current.innerHTML = value || ''; last.current = value; } }, [value, source]);
  const emit = () => { const html = ref.current.innerHTML.replace(/^<br>$/, ''); last.current = html; onChange(html); };
  const cmd = (name) => {
    ref.current.focus();
    const run = (c, a) => document.execCommand(c, false, a);
    switch (name) {
      case 'bold': case 'italic': case 'underline': run(name); break;
      case 'h1': case 'h2': case 'h3': case 'p': case 'quote': {
        // Click the same heading again to turn it back into normal text.
        const tag = name === 'quote' ? 'blockquote' : name;
        const current = String(document.queryCommandValue('formatBlock') || '').replace(/[<>]/g, '').toLowerCase();
        run('formatBlock', `<${current === tag && tag !== 'p' ? 'p' : tag}>`);
        break;
      }
      case 'ul': run('insertUnorderedList'); break;
      case 'ol': run('insertOrderedList'); break;
      case 'left': run('justifyLeft'); break;
      case 'center': run('justifyCenter'); break;
      case 'unlink': run('unlink'); break;
      case 'clear': run('removeFormat'); run('formatBlock', '<p>'); break;
      case 'link': { const url = window.prompt('Link address (https://… or /page)'); if (url && /^(https?:\/\/|\/|mailto:|tel:)/i.test(url.trim())) run('createLink', url.trim()); break; }
      default: break;
    }
    emit();
  };
  return (
    <div className="grid gap-1.5 sm:col-span-2">
      {label && <span className="text-sm font-medium text-taupe-700">{label}</span>}
      <div className="overflow-hidden rounded-xl border border-taupe-200 bg-white focus-within:border-primary">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-taupe-100 bg-taupe-50 px-2 py-1.5">
          {TOOLS.map((t, i) => (t === '|' ? <span key={i} className="mx-1 h-5 w-px bg-taupe-200" />
            : <button key={t[0]} type="button" title={t[1]} aria-label={t[1]} disabled={source} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd(t[0])} className={`grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-sm hover:bg-taupe-200 disabled:opacity-40 ${t[3] || ''}`}>{t[2]}</button>))}
          <button type="button" onClick={() => { if (source) { setSource(false); } else { emit(); setSource(true); } }} className={`ml-auto rounded-md px-2.5 py-1 text-xs font-bold ${source ? 'bg-taupe-900 text-white' : 'hover:bg-taupe-200'}`}>HTML</button>
        </div>
        {source
          ? <textarea value={value || ''} onChange={(e) => { last.current = e.target.value; onChange(e.target.value); }} style={{ minHeight }} className="block w-full resize-y p-3 font-mono text-xs focus:outline-none" spellCheck={false} />
          : <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit} onBlur={emit} style={{ minHeight }} className="rte p-4 text-sm leading-relaxed focus:outline-none" />}
      </div>
      {help && <p className="text-xs text-taupe-600">{help}</p>}
    </div>
  );
}
