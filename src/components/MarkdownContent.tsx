"use client";

import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia - abaikan */
    }
  };

  return (
    <button
      onClick={copy}
      className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-100"
    >
      {copied ? "✓ Tersalin" : "Salin"}
    </button>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/70 bg-[#0f1320]">
      <div className="flex items-center justify-between border-b border-slate-700/70 bg-slate-800/60 px-3 py-1.5">
        <span className="font-mono text-xs text-slate-400">{language || "teks"}</span>
        <CopyButton text={code} />
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, background: "transparent", fontSize: "0.82rem", padding: "1rem" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const markdownComponents: Record<string, any> = {
  code({ className, children, ...props }: any) {
    const match = /language-([\w+-]+)/.exec(className ?? "");
    const raw = String(children ?? "").replace(/\n$/, "");

    if (match) {
      return <CodeBlock language={match[1]} code={raw} />;
    }
    if (raw.includes("\n")) {
      return <CodeBlock language="" code={raw} />;
    }
    return (
      <code
        className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-300"
        {...props}
      >
        {children}
      </code>
    );
  },
  table({ children }: { children?: ReactNode }) {
    return (
      <div className="my-4 overflow-x-auto rounded-xl border border-slate-700/70">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }: { children?: ReactNode }) {
    return (
      <th className="border-b border-slate-700/70 bg-slate-800/50 px-3 py-2 text-left text-slate-200">
        {children}
      </th>
    );
  },
  td({ children }: { children?: ReactNode }) {
    return <td className="border-b border-slate-700/40 px-3 py-2 align-top text-slate-300">{children}</td>;
  },
  a({ children, href }: { children?: ReactNode; href?: string }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:decoration-sky-400"
      >
        {children}
      </a>
    );
  },
  h1({ children }: { children?: ReactNode }) {
    return <h1 className="mb-3 mt-4 text-xl font-bold text-white">{children}</h1>;
  },
  h2({ children }: { children?: ReactNode }) {
    return <h2 className="mb-2 mt-4 text-lg font-bold text-white">{children}</h2>;
  },
  h3({ children }: { children?: ReactNode }) {
    return <h3 className="mb-2 mt-3 text-base font-semibold text-slate-100">{children}</h3>;
  },
  ul({ children }: { children?: ReactNode }) {
    return <ul className="my-2 list-disc space-y-1 pl-6 text-slate-300">{children}</ul>;
  },
  ol({ children }: { children?: ReactNode }) {
    return <ol className="my-2 list-decimal space-y-1 pl-6 text-slate-300">{children}</ol>;
  },
  p({ children }: { children?: ReactNode }) {
    return <p className="my-2 leading-relaxed text-slate-300">{children}</p>;
  },
  blockquote({ children }: { children?: ReactNode }) {
    return (
      <blockquote className="my-3 rounded-r-lg border-l-4 border-amber-400/70 bg-amber-400/5 px-4 py-2 text-slate-300">
        {children}
      </blockquote>
    );
  },
};

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="break-words text-[0.95rem]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
