import { common, sites } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag, type TagTone } from "@baret/ui/primitives/Tag";
import { Empty } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { day } from "@baret/wallet-ui/data/format";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router";
import { OPTIONS_ART } from "../../../assets.js";
import { canSpend } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import type { Permission, Site, SiteStatus } from "../../../data/types.js";
import { timeOf } from "../../../data/words.js";
import { Search } from "../parts/kit.js";

/**
 * Sites: every site that ever asked this wallet to connect, allowed or not,
 * newest request first. A search by site and five filters narrow the table;
 * each site links to its own page, where it is paused, blocked, disconnected
 * or forgotten. Below 640 px a row keeps the site, its status under it and
 * the last request; the dates and counts join from 768 px. A site forgotten
 * on its own page is announced here, in the page's status line.
 */

type FilterId = (typeof sites.filters)[number]["id"];

/** The tag each status wears: a connected site is watched, a blocked one reads Blocked. */
const TONE: Record<SiteStatus, TagTone> = {
  connected: "watching",
  paused: "neutral",
  blocked: "blocked",
  notConnected: "neutral",
};

function matches(site: Site, filter: FilterId, permissions: readonly Permission[]): boolean {
  switch (filter) {
    case "all":
      return true;
    case "spending":
      return canSpend(site, permissions);
    default:
      return site.status === filter;
  }
}

/** Newest request first; a site that never sent one counts from its first visit. */
function byLastRequest(a: Site, b: Site): number {
  return Date.parse(b.lastUsed ?? b.firstSeen) - Date.parse(a.lastUsed ?? a.firstSeen);
}

/** The origin the detail page just forgot, handed over with the navigation. */
function forgottenIn(state: unknown): string | null {
  if (typeof state !== "object" || state === null || !("forgot" in state)) return null;
  return typeof state.forgot === "string" ? state.forgot : null;
}

const TH = `${T.label} py-3 font-normal`;
const TD = `py-3.5 text-sm text-[color:var(--fg)] ${T.num}`;
const SITE_LINK =
  "font-mono text-base text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 [overflow-wrap:anywhere] hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

export function Component() {
  const { state } = useExtension();
  const location = useLocation();
  const group = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [said, setSaid] = useState("");
  const { columns } = sites;

  // Said once the status line is already on the page: a live region that
  // arrives with its text is not read. After a reload the sample brings the
  // site back, so nothing is said then.
  const forgot = forgottenIn(location.state);
  useEffect(() => {
    if (forgot && !state.sites.some((s) => s.origin === forgot)) {
      setSaid(fill(sites.detail.done.forgotten, { origin: forgot }));
    }
  }, [forgot, state.sites]);

  const needle = query.trim().toLowerCase();
  const rows = state.sites
    .filter((s) => matches(s, filter, state.permissions))
    .filter((s) => s.origin.toLowerCase().includes(needle))
    .sort(byLastRequest);
  const held = (origin: string) => state.permissions.filter((p) => p.origin === origin).length;

  function clear(): void {
    setQuery("");
    setFilter("all");
  }

  return (
    <Screen title={sites.title} body={sites.lead} picture={OPTIONS_ART.sites}>
      <div>
        <p role="status" className="text-base text-[color:var(--fg)]">
          {said ? (
            <span className="mb-6 block border-l-4 border-[color:var(--fg)] pl-3 [overflow-wrap:anywhere]">
              {said}
            </span>
          ) : null}
        </p>

        {state.sites.length === 0 ? (
          <Empty title={sites.empty.title} body={sites.empty.body} />
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4">
              <div className="md:max-w-[26rem]">
                <Search
                  label={sites.search.placeholder}
                  placeholder={sites.search.placeholder}
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <fieldset className="min-w-0">
                <legend className="sr-only">{sites.filter.legend}</legend>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {sites.filters.map((f) => (
                    <Segment
                      key={f.id}
                      name={group}
                      value={f.id}
                      checked={filter === f.id}
                      label={f.label}
                      onSelect={() => setFilter(f.id)}
                    />
                  ))}
                </div>
              </fieldset>
            </div>

            {rows.length === 0 ? (
              <Empty
                title={sites.emptyFiltered.title}
                body={sites.emptyFiltered.body}
                action={
                  <Button type="button" variant="ghost" size="sm" onClick={clear}>
                    {sites.emptyFiltered.action.label}
                  </Button>
                }
              />
            ) : (
              <table className="w-full border-collapse">
                <caption className="sr-only">{sites.title}</caption>
                <thead>
                  <tr className="border-b border-[color:var(--rule)] align-bottom">
                    <th scope="col" className={`${TH} pr-4 text-left`}>
                      {columns.site}
                    </th>
                    <th scope="col" className={`${TH} hidden pr-4 text-left sm:table-cell`}>
                      {columns.status}
                    </th>
                    <th scope="col" className={`${TH} hidden pr-4 text-left md:table-cell`}>
                      {columns.firstSeen}
                    </th>
                    <th scope="col" className={`${TH} text-right md:pr-4 md:text-left`}>
                      {columns.lastUsed}
                    </th>
                    <th scope="col" className={`${TH} hidden pr-4 text-right md:table-cell`}>
                      {columns.permissions}
                    </th>
                    <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
                      {columns.requests}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((site) => {
                    const status = sites.status[site.status];
                    const count = held(site.origin);
                    return (
                      <tr
                        key={site.origin}
                        className="border-b border-[color:var(--rule)] align-baseline"
                      >
                        <th scope="row" className="py-3.5 pr-4 text-left font-normal">
                          <Link
                            to={`/sites/${encodeURIComponent(site.origin)}`}
                            className={SITE_LINK}
                          >
                            {site.origin}
                          </Link>
                          <span className="mt-2 flex sm:hidden">
                            <Tag tone={TONE[site.status]} size="sm">
                              {status.label}
                            </Tag>
                          </span>
                        </th>
                        <td className="hidden py-3.5 pr-4 sm:table-cell">
                          <Tag tone={TONE[site.status]} size="sm">
                            {status.label}
                          </Tag>
                          <span className={`mt-1.5 hidden max-w-[32ch] xl:block ${T.small}`}>
                            {status.hint}
                          </span>
                        </td>
                        <td className={`${TD} hidden pr-4 md:table-cell`}>{day(site.firstSeen)}</td>
                        <td className={`${TD} text-right md:pr-4 md:text-left`}>
                          {site.lastUsed ? timeOf(site.lastUsed) : common.ui.none}
                        </td>
                        <td className={`${TD} hidden pr-4 text-right md:table-cell`}>
                          {count > 0 ? String(count) : common.ui.none}
                        </td>
                        <td className={`${TD} hidden text-right md:table-cell`}>{site.requests}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Screen>
  );
}
