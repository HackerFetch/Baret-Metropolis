import type { ReactNode } from "react";

/** The frame every options screen shares. */
export function Page({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2.5 border-b border-[color:var(--rule)] pb-5">
        <h1 className="text-display-l">{title}</h1>
        {body ? <p className="max-w-[70ch] text-[color:var(--fg-muted)]">{body}</p> : null}
      </header>
      {children}
    </div>
  );
}
