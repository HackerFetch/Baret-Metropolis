import { signRequest } from "@baret/content/extension/popup/sign-request.content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { Component, type ErrorInfo, type JSX, type ReactNode } from "react";
import { ERRORS, type RpcOutcome } from "../core/protocol.js";

/**
 * The last line of the request window. A screen that throws while it renders
 * a request would otherwise leave the window empty and the site waiting on a
 * promise that never settles, with every later request queued behind it.
 * Here the site gets its refusal at once (4001, nothing was signed), and the
 * reader sees what happened and a way out.
 */
export class RequestBoundary extends Component<
  {
    readonly onAnswer: (outcome: RpcOutcome) => void;
    readonly onFinished: () => void;
    readonly children: ReactNode;
  },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Fail closed: the site is refused before anything else happens.
    this.props.onAnswer({ error: ERRORS.rejected });
    console.error("Baret: the request window failed to render", error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <Failed onDecline={this.props.onFinished} />;
  }
}

function Failed({ onDecline }: { onDecline: () => void }): JSX.Element {
  const { failed } = signRequest;
  return (
    <section role="alert" className="grid gap-4 px-5 py-6">
      <h1 className="font-display text-2xl font-extrabold uppercase leading-tight text-[color:var(--fg)]">
        {failed.title}
      </h1>
      <p className={T.body}>{failed.body}</p>
      <Button type="button" variant="primary" block onClick={onDecline}>
        {failed.action}
      </Button>
    </section>
  );
}
