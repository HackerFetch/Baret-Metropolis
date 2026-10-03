import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { Disclosures } from "@baret/web-ui/components/Disclosures";
import { Img } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { RuleSwitch } from "@baret/web-ui/components/RuleSwitch";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId, useState } from "react";
import { BRAND_ART, BRAND_CLIP, type ImgAsset, SOCIAL_ART } from "../shared/assets.js";

/**
 * /kit additions (internal, out of the nav): the shared controls of
 * @baret/web-ui as every page uses them, and the brand and social pictures
 * with their file ids, so the whole imagery set can be reviewed in both
 * themes. The words here are component and file names, not product copy.
 */

const SAMPLE = [
  { summary: "Disclosures", body: "One name per list, so opening one item closes the others." },
  { summary: "Exclusive", body: "Native details: keyboard, find-in-page and screen readers work." },
];

function Controls(): JSX.Element {
  const name = useId();
  const [picked, setPicked] = useState("a");
  const [on, setOn] = useState(true);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="grid content-start gap-4">
        <p className={T.label}>Segment</p>
        <div className="grid grid-cols-2 gap-2">
          {["a", "b"].map((value) => (
            <Segment
              key={value}
              name={name}
              value={value}
              checked={picked === value}
              label={`Segment ${value}`}
              onSelect={setPicked}
            />
          ))}
        </div>
        <p className={T.label}>RuleSwitch</p>
        <RuleSwitch label="RuleSwitch" stateWord={on ? "On" : "Off"} on={on} onToggle={setOn} />
        <p className={T.label}>CopyButton</p>
        <div className="flex items-center gap-2 border border-[color:var(--rule-strong)] pl-3">
          <code className="flex-1 font-mono text-sm">
            0x0A82671420114E47c672D5e8e23017DdCE850A35
          </code>
          <CopyButton
            text="0x0A82671420114E47c672D5e8e23017DdCE850A35"
            label="Copy"
            done="Copied"
          />
        </div>
        <p className={T.label}>LinkButton</p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="#kit-web" label="primary" variant="primary" />
          <LinkButton href="#kit-web" label="ghost" />
        </div>
      </div>
      <div className="grid content-start gap-4">
        <p className={T.label}>Disclosures</p>
        <Disclosures name="kit-disclosures" items={SAMPLE} />
      </div>
    </div>
  );
}

function Gallery({
  title,
  items,
}: {
  title: string;
  items: Record<string, ImgAsset>;
}): JSX.Element {
  return (
    <div className="grid gap-3">
      <p className={T.label}>{title}</p>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {Object.entries(items).map(([id, asset]) => (
          <li key={id} className="grid gap-1">
            <div
              className="relative aspect-square overflow-hidden border border-[color:var(--rule)]"
              style={{ backgroundColor: asset.ground }}
            >
              <Img
                asset={asset}
                fit="contain"
                sizes="200px"
                className="absolute inset-0 size-full"
              />
            </div>
            <span className="font-mono text-label text-[color:var(--fg-muted)]">{id}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KitWebLayer(): JSX.Element {
  return (
    <section
      id="kit-web"
      className="mx-auto grid w-full max-w-[1180px] gap-10 border-t border-[color:var(--rule)] px-5 py-14"
    >
      <h2 className={`${T.h2} text-[color:var(--fg)]`}>Web layer and imagery</h2>
      <Controls />
      <Gallery title="BRAND_ART" items={BRAND_ART} />
      <Gallery title="SOCIAL_ART" items={SOCIAL_ART} />
      <div className="grid gap-3">
        <p className={T.label}>BRAND_CLIP</p>
        <video
          src={BRAND_CLIP.src}
          width={BRAND_CLIP.width}
          height={BRAND_CLIP.height}
          controls
          preload="metadata"
          muted
          className="h-auto w-full max-w-[640px] border border-[color:var(--rule)]"
        />
      </div>
    </section>
  );
}
