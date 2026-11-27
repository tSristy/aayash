'use client';
import { useEffect } from 'react';

/** Inserts admin-managed tracking snippets (GTM, TikTok…) into the page. Admin-only content. */
export default function TagInjector({ head = [], body = [] }) {
  const key = JSON.stringify([head, body]);
  useEffect(() => {
    const added = [];
    const put = (html, target) => {
      const box = document.createElement('div'); box.innerHTML = html;
      [...box.childNodes].forEach((node) => {
        let el = node;
        if (node.nodeName === 'SCRIPT') { el = document.createElement('script'); [...node.attributes].forEach((a) => el.setAttribute(a.name, a.value)); el.text = node.textContent; }
        target.appendChild(el); added.push(el);
      });
    };
    head.forEach((h) => put(h, document.head)); body.forEach((b) => put(b, document.body));
    return () => added.forEach((el) => el.remove());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
