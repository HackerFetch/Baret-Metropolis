import { walletFrame } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";

/** Above every screen: nothing here is connected yet, and nothing is sent. */
export function SampleNotice(): JSX.Element {
  return (
    <aside
      aria-label={walletFrame.sample.tag}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[color:var(--rule)] pb-4"
    >
      <Tag tone="neutral" size="sm">
        {walletFrame.sample.tag}
      </Tag>
      <p className={`${T.small} min-w-[24ch] flex-1`}>{walletFrame.sample.body}</p>
    </aside>
  );
}
