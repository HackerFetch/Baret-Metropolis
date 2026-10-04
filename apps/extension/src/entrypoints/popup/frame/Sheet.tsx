import { common } from "@baret/content";
import { Button } from "@baret/ui";
import { EASE_OUT_SOFT } from "@baret/web-ui/lib/motion";
import { T } from "@baret/web-ui/lib/type";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { ArrowLeft } from "lucide-react";
import { m } from "motion/react";
import { type JSX, type ReactNode, useEffect, useId, useRef } from "react";

/**
 * The popup's two layers above a tab.
 *
 * Sheet: a screen that covers the tab's content and keeps the tab bar (send,
 * receive, swap, accounts, alerts). It slides up 6 px over 260 ms (BRAND
 * sheet slide) as it opens, takes the focus on its back button, and Escape
 * closes it. On close the focus goes back to the control that opened it.
 *
 * Confirm: a decision that cannot be undone or that costs a fee (revoke,
 * reset, revoke all). A native modal dialog at the foot of the window, so the
 * focus stays inside it and Escape cancels; it says every consequence before
 * the button. While `busy` (the action is running) Escape and Cancel do nothing
 * and the dialog stays open, so it never closes out of step with the state.
 */

/** BRAND sheet slide: 260 ms on the soft ease, a 6 px product rise. */
const SHEET = { duration: 0.26, ease: EASE_OUT_SOFT } as const;
const SHEET_RISE = 6;

/**
 * Each open sheet's opener. A sheet opened from inside another sheet (Send's
 * Receive link) takes over the first sheet's opener, since the link that
 * opened it leaves with the first sheet.
 */
const OPENERS = new WeakMap<Element, Element>();

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
  const root = useRef<HTMLElement>(null);
  const reduce = useReduce();

  useEffect(() => {
    const active = document.activeElement;
    const parent = active?.closest("[data-sheet]");
    const opener = (parent && OPENERS.get(parent)) ?? active;
    if (root.current && opener) OPENERS.set(root.current, opener);
    back.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <m.section
      ref={root}
      data-sheet=""
      aria-labelledby={id}
      initial={reduce ? false : { opacity: 0, y: SHEET_RISE }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: SHEET_RISE }}
      transition={SHEET}
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
  busy = false,
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
  busy?: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // The latest props, for the native close event.
  const latest = useRef({ open, busy });
  latest.current = { open, busy };

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
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={() => {
        // A close the browser forced through while busy: open it again.
        const { open: wanted, busy: working } = latest.current;
        if (wanted && working) {
          ref.current?.showModal();
          return;
        }
        onCancel();
      }}
      className="m-0 mt-auto max-h-[88%] w-full max-w-full border-t border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-0 text-[color:var(--fg)] backdrop:bg-black/55"
    >
      <div className="grid gap-4 px-4 pt-5 pb-4">
        <h2 id={titleId} className={`${T.h3} text-[color:var(--fg)]`}>
          {title}
        </h2>
        <div className="grid gap-3">{children}</div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
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
