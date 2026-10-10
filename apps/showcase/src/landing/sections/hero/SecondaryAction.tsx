import { LinkButton } from "@baret/web-ui/components/LinkButton";
import type { JSX } from "react";

/**
 * The secondary action, "Try the demo" (G-02: the web wallet is the first
 * button, the demo the second). It keeps a phone label of its own; the
 * hidden copy is display:none, so only one link is ever in the tab order and
 * the accessibility tree.
 */
export function SecondaryAction({
  action,
}: {
  action: { label: string; labelPhone: string; href: string };
}): JSX.Element {
  return (
    <>
      <span className="contents md:hidden">
        <LinkButton
          href={action.href}
          label={action.labelPhone}
          variant="ghostInverse"
          size="lg"
          fullOnPhone
        />
      </span>
      <span className="contents max-md:hidden">
        <LinkButton href={action.href} label={action.label} variant="ghostInverse" size="lg" />
      </span>
    </>
  );
}
