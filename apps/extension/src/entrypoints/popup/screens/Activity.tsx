import { popupActivity } from "@baret/content/extension/popup/activity.content";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useState } from "react";
import { POPUP_ART } from "../../../assets.js";
import { byDay, matchesPopupFilter, type PopupFilter } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import { Chips, PopupEmpty, TabTitle, TextButton } from "../frame/bits.js";
import { ActivityDisclosure } from "../parts/ActivityLine.js";

/**
 * Activity, the compact log (docs/WALLET.md 2.2): six filters, the rows of
 * today, yesterday and earlier, each opening in place into its verdict, its
 * findings, what changed and the transaction. Every verdict lands here,
 * the declined ones too. The full log, with search and export, is on the
 * options page.
 */
export function ActivityTab({ onFull }: { onFull: () => void }): JSX.Element {
  const { state } = useExtension();
  const [filter, setFilter] = useState<PopupFilter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const mine = state.activity.filter((item) => item.account === state.active);
  const rows = mine.filter((item) => matchesPopupFilter(item, filter));

  return (
    <div className="pb-4">
      <TabTitle title={popupActivity.title} />
      {mine.length === 0 ? (
        <PopupEmpty
          picture={POPUP_ART.activity}
          title={popupActivity.empty.title}
          body={popupActivity.empty.body}
        />
      ) : (
        <>
          <Chips
            legend={popupActivity.title}
            options={popupActivity.filters}
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setOpen(null);
            }}
          />
          {rows.length === 0 ? (
            <div className="mx-4 mt-4 grid gap-1 border border-dashed border-[color:var(--rule-strong)] p-4">
              <p className="text-sm font-medium text-[color:var(--fg)]">
                {popupActivity.emptyFiltered.title}
              </p>
              <p className={T.small}>{popupActivity.emptyFiltered.body}</p>
              <div className="flex">
                <TextButton onClick={() => setFilter("all")}>
                  {popupActivity.emptyFiltered.action.label}
                </TextButton>
              </div>
            </div>
          ) : (
            byDay(rows).map(({ group, items }) => (
              <section key={group} aria-label={popupActivity.groups[group]} className="mt-3">
                <h2 className={`${T.label} px-4 pb-1`}>{popupActivity.groups[group]}</h2>
                <ul className="grid border-t border-[color:var(--rule)]">
                  {items.map((item) => (
                    <li key={item.id} className="border-b border-[color:var(--rule)]">
                      <ActivityDisclosure
                        item={item}
                        open={open === item.id}
                        onToggle={() => setOpen(open === item.id ? null : item.id)}
                        onFull={onFull}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
