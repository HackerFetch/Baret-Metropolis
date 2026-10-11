import { useEffect, useRef } from "react";
import { useExtension } from "../data/store.js";
import { openGrants, settledPayments } from "./records-chain.js";
import { USDC } from "./wallet.js";

/**
 * Keeps the allowances list and the x402 payments true to Monad while the
 * wallet is open: a grant the chain no longer holds leaves the list (revoked
 * here or with any other wallet), and a payment whose authorisation the
 * token has used reads as settled.
 */
export function useRecords(open: boolean): void {
  const { state, dispatch } = useExtension();
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const refresh = async () => {
      const { permissions, payments, accounts } = latest.current;
      if (permissions.length === 0 && payments.every((p) => p.stage === "settled")) return;
      const [grants, paid] = await Promise.all([
        openGrants(permissions, accounts),
        settledPayments(payments, USDC),
      ]);
      if (!alive) return;
      const now = latest.current;
      // Only what was read is applied to what the lists hold now.
      const gone = new Set(
        permissions.filter((p) => !grants.some((g) => g.id === p.id)).map((p) => p.id),
      );
      const settled = new Set(paid.filter((p) => p.stage === "settled").map((p) => p.id));
      const nextPermissions = now.permissions.filter((p) => !gone.has(p.id));
      const nextPayments = now.payments.map((p) =>
        settled.has(p.id) && p.stage !== "settled" ? { ...p, stage: "settled" as const } : p,
      );
      const changed =
        nextPermissions.length !== now.permissions.length ||
        nextPayments.some((p, i) => p !== now.payments[i]);
      if (changed) {
        dispatch({
          type: "patch",
          patch: { permissions: nextPermissions, payments: nextPayments },
        });
      }
    };
    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [open, dispatch]);
}
