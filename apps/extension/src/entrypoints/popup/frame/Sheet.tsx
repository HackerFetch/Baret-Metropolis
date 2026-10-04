import { common } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { ArrowLeft } from "lucide-react";
import { m } from "motion/react";
import { type JSX, type ReactNode, useEffect, useId, useRef } from "react";

/**
 * The popup's two layers above a tab.
 *
 * Sheet: a screen that covers the tab's content and keeps the tab bar (send,
 * receive, swap, accounts, alerts). It rises 12 px as it opens, takes the
 * focus on its back button, and Escape closes it.
 *
 * Confirm: a decision that cannot be undone or that costs a fee (revoke,
 * reset, revoke all). A native modal dialog at the foot of the window, so the
 * focus stays inside it and Escape cancels; it says every consequence before
 * the button.
 */

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element {
  const id = useId();
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    back.current?.focus();
  }, []);

  return (
    <m.section
      aria-labelledby={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="absolute inset-0 z-20 flex flex-col bg-[color:var(--ground)]"
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[color:var(--rule)] px-2">
        <button
          ref={back}
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center text-[color:var(--fg)] transition-colors hover:bg-[color:var(--ground-deep)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
          <span className="sr-only">{common.actions.back}</span>
        </button>
        <h2
          id={id}
          className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-[color:var(--fg)]"
        >
          {title}
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </m.section>
  );
}

export function Confirm({
  open,
  title,
  children,
  action,
  cancel,
  onConfirm,
  onCancel,
  danger = true,
  disabled = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  action: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  disabled?: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onCancel}
      className="m-0 mt-auto max-h-[88%] w-full max-w-full border-t border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-0 text-[color:var(--fg)] backdrop:bg-black/55"
    >
      <div className="grid gap-4 px-4 pt-5 pb-4">
        <h2 id={titleId} className={`${T.h3} text-[color:var(--fg)]`}>
          {title}
        </h2>
        <div className="grid gap-3">{children}</div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            disabled={disabled}
            onClick={onConfirm}
          >
            {action}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
