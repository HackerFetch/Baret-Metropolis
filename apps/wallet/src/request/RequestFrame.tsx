import { common, walletFrame } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, type ReactNode, useId } from "react";
import { Brand } from "../components/Brand.js";
import { SampleNotice } from "../components/SampleNotice.js";

/**
 * The window a site opens for a request (/sign, /connect): no sidebar and no
 * nav, one narrow column, the mark and the network on top. Until the wallet
 * is wired, the sample notice and a picker of sample requests sit above the
 * request itself, so each verdict can be read in turn.
 */

export interface SampleOption<V extends string> {
  readonly value: V;
  readonly label: string;
}

export function SamplePicker<V extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SampleOption<V>[];
  value: V;
  onChange: (value: V) => void;
}): JSX.Element {
  const name = useId();
  return (
    <fieldset className="grid gap-3">
      <legend className={T.label}>{walletFrame.samples.legend}</legend>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <Segment
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            label={option.label}
            onSelect={(next) => {
              const picked = options.find((o) => o.value === next);
              if (picked) onChange(picked.value);
            }}
          />
        ))}
      </div>
      <p className={T.small}>{walletFrame.samples.note}</p>
    </fieldset>
  );
}

export function RequestFrame({
  picker,
  children,
}: {
  picker: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--rule)] bg-[color:var(--ground-deep)]">
        <div className="mx-auto flex h-16 w-full max-w-[640px] items-center justify-between gap-4 px-4 md:px-6">
          <Brand />
          <Tag tone="network" size="sm">
            {common.networks.testnet.label}
          </Tag>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[640px] gap-8 px-4 pt-6 pb-16 md:px-6 md:pt-8">
        <SampleNotice />
        {picker}
        {children}
      </main>
    </div>
  );
}
