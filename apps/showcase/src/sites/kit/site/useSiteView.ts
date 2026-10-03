import { useSearchParams } from "react-router";

/**
 * Which of a demo dApp's pages is open. The page lives in `?view=`, so Back
 * works and a page can be linked; the first view is the home page and has no
 * parameter. An unknown value falls back to the home page.
 */
export function viewFrom<V extends string>(views: readonly V[], raw: string | null): V | undefined {
  return views.find((v) => v === raw) ?? views[0];
}

export function useSiteView<V extends string>(
  views: readonly [V, ...V[]],
): { view: V; go: (next: V) => void } {
  const [params, setParams] = useSearchParams();
  const home = views[0];
  const view = viewFrom(views, params.get("view")) ?? home;

  function go(next: V): void {
    setParams(next === home ? {} : { view: next });
    window.scrollTo({ top: 0 });
  }

  return { view, go };
}
