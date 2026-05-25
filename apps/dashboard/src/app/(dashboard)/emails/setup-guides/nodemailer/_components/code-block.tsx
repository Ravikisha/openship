"use client";

/**
 * Code block with a header showing the filename + a copy button.
 *
 * No syntax highlighting — keeps the bundle small. Code is rendered in
 * the platform's mono font with the same dimmed-card treatment used
 * elsewhere for read-only field values.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  filename: string;
  children: string;
}

export function CodeBlock({ language, filename, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* HTTP fallback */
    }
  };
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/40">
        <span className="text-[11px] font-mono text-muted-foreground">
          {filename}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Copy ${language} snippet`}
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-3 text-[12px] font-mono leading-relaxed text-foreground overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
}
