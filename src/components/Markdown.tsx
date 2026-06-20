import { Fragment, type ReactNode } from "react";
import styles from "./Markdown.module.css";

// Minimal markdown renderer for AI report output. Handles headings, bold
// inline spans, unordered/ordered lists and paragraphs — no external deps.

function renderInline(text: string, keyBase: string): ReactNode[] {
  // Split on **bold** segments, keeping the delimiters out of the output.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyBase}-b${i}`} className={styles.strong}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${keyBase}-t${i}`}>{part}</Fragment>;
  });
}

export default function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length === 0) return;
    const text = para.join(" ").trim();
    if (text) {
      blocks.push(
        <p key={`p${key++}`} className={styles.p}>
          {renderInline(text, `p${key}`)}
        </p>
      );
    }
    para = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) {
      list = null;
      return;
    }
    const items = list.items.map((it, i) => (
      <li key={`li${i}`} className={styles.li}>
        {renderInline(it, `li${key}-${i}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={`ol${key++}`} className={styles.ol}>
          {items}
        </ol>
      ) : (
        <ul key={`ul${key++}`} className={styles.ul}>
          {items}
        </ul>
      )
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1].length;
      const cls = level <= 2 ? styles.h2 : styles.h3;
      blocks.push(
        <p key={`h${key++}`} className={cls}>
          {renderInline(heading[2], `h${key}`)}
        </p>
      );
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    para.push(trimmed);
  }

  flushPara();
  flushList();

  return <div className={styles.md}>{blocks}</div>;
}
