import {
  AddressChip,
  Amount,
  Button,
  ChangeRow,
  Countdown,
  EmptyState,
  Finding,
  HazardStripe,
  KeyValue,
  Label,
  Mark,
  Meter,
  Panel,
  StepIndicator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  Verdict,
  VerdictTag,
} from "@baret/ui";
import { Section } from "../components/Section.js";

/**
 * /kit. Every component on one page.
 *
 * Not linked from the nav. It exists so a change to a token or a primitive can
 * be judged in both themes in one screen, and so a reviewer can see the whole
 * system without opening twelve pages.
 */
export function Component() {
  return (
    <>
      <title>Baret kit</title>

      <header className="grid-paper border-b border-[color:var(--rule)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-4 px-5 py-12">
          <Tag tone="brand" size="sm">
            Internal
          </Tag>
          <h1 className="font-stencil text-6xl uppercase leading-[0.9]">The kit</h1>
          <p className="max-w-[60ch] text-lg text-[color:var(--fg-muted)]">
            Every component, in the theme you are looking at. Switch your system between light and
            dark to check both.
          </p>
        </div>
      </header>

      <Section index="01" eyebrow="Brand" title="Mark and tags">
        <div className="grid gap-3.5 md:grid-cols-2">
          <Panel>
            <Label>Mark</Label>
            <div className="flex items-end gap-5">
              {[24, 48, 96].map((size) => (
                <Mark key={size} size={size} slit="var(--surface)" />
              ))}
            </div>
          </Panel>
          <Panel>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              <Tag tone="safe" size="sm">
                Safe to sign
              </Tag>
              <Tag tone="caution" size="sm">
                Caution
              </Tag>
              <Tag tone="blocked" size="sm">
                Blocked
              </Tag>
              <Tag tone="watching" size="sm">
                Watching
              </Tag>
              <Tag tone="network" size="sm">
                Monad testnet
              </Tag>
              <Tag tone="brand" size="sm">
                Baret
              </Tag>
              <Tag size="sm">Not checked</Tag>
            </div>
            <HazardStripe className="mt-2" />
          </Panel>
        </div>
      </Section>

      <Section index="02" eyebrow="Actions" title="Buttons" deep>
        <Panel>
          <Label>Variants</Label>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary">Sign and send</Button>
            <Button variant="ghost">Decline</Button>
            <Button variant="soft">Pause</Button>
            <Button variant="danger">Revoke</Button>
            <Button variant="primary" disabled>
              Blocked
            </Button>
          </div>
          <Label>Sizes</Label>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </Panel>
      </Section>

      <Section index="03" eyebrow="The product" title="Verdicts and findings">
        <div className="grid gap-3.5 lg:grid-cols-2">
          <div className="grid gap-3.5">
            <Verdict kind="safe" label="Safe to sign" body="Nothing here breaks a rule you set." />
            <Verdict
              kind="caution"
              label="Sign with caution"
              body="Allowed, and there is something you should know."
            />
            <Verdict kind="blocked" label="Blocked" body="Stopped by: block unlimited approvals." />
            <Verdict
              kind="unreachable"
              label="Not checked"
              body="Baret could not reach the analysis server."
            />
          </div>

          <Panel>
            <Label>Findings</Label>
            <Finding
              severity="critical"
              title="This is an unlimited approval"
              body="0x9f3a…c1d2 would be able to move all of your USDC, now and anything you receive later."
              why="This is the single most common way wallets get emptied. The signature looks like a normal approval and it never expires."
            />
            <Finding
              severity="medium"
              title="Nobody has verified this contract"
              body="It has no published source and no history that Baret recognises."
            />
            <Finding
              severity="low"
              title="Baret could not see everything"
              body="Part of the simulation data was missing, so this result covers less than usual."
            />
          </Panel>
        </div>
      </Section>

      <Section index="04" eyebrow="Data" title="Amounts, addresses, caps" deep>
        <div className="grid gap-3.5 md:grid-cols-3">
          <Panel>
            <Label>What changes</Label>
            <ChangeRow label="You send" value="0.50" unit="MON" direction="out" />
            <ChangeRow label="Network fee" value="0.0002" unit="MON" direction="out" />
            <ChangeRow label="USDC allowance" value="unlimited" note="no limit" />
            <ChangeRow label="You receive" value="124.80" unit="USDC" direction="in" />
          </Panel>

          <Panel>
            <Label>Cap</Label>
            <p id="cap-text" data-numeric className="font-stencil text-display-xl">
              62{" "}
              <span className="font-display text-xl text-[color:var(--fg-faint)]">/ 100 USDC</span>
            </p>
            <Meter value={62} max={100} describedBy="cap-text" />
            <p id="cap-full" data-numeric className="mt-2 font-mono text-sm">
              96 / 100 USDC
            </p>
            <Meter value={96} max={100} describedBy="cap-full" />
            <p id="cap-over" data-numeric className="mt-2 font-mono text-sm">
              100 / 100 USDC
            </p>
            <Meter value={100} max={100} describedBy="cap-over" />
          </Panel>

          <Panel>
            <Label>Values</Label>
            <KeyValue label="Address">
              <AddressChip address="0x1e09E971c53bD59e481Ef02147C6CeeBf0B09717" />
            </KeyValue>
            <KeyValue label="Balance">
              <Amount value="1,240.50" unit="MON" />
            </KeyValue>
            <KeyValue label="Verdict">
              <VerdictTag kind="blocked" label="Blocked" />
            </KeyValue>
            <Countdown seconds={263} label="Declines automatically in {time}" />
          </Panel>
        </div>
      </Section>

      <Section index="05" eyebrow="Controls" title="Forms and states">
        <div className="grid gap-3.5 md:grid-cols-2">
          <Panel>
            <Label>Rules</Label>
            {[
              ["Block unlimited approvals", true],
              ["Block operator grants on collections", true],
              ["Block unknown contracts", false],
            ].map(([label, on]) => (
              <div
                key={String(label)}
                className="flex items-start justify-between gap-4 border-b border-[color:var(--rule)] py-2.5 last:border-b-0"
              >
                <span className="text-sm">{label}</span>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
            <StepIndicator
              steps={["Welcome", "Passphrase", "Keys", "Backup", "Done"]}
              current={2}
            />
          </Panel>

          <Panel>
            <Label>Tabs and empty states</Label>
            <Tabs defaultValue="rules">
              <TabsList>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="rules">
                <EmptyState
                  title="Nothing can spend from this wallet"
                  body="That is the safest possible state. When you approve a token it appears here with a cap."
                  action={<Button size="sm">Create a permission</Button>}
                />
              </TabsContent>
              <TabsContent value="json">
                <pre className="overflow-x-auto bg-[color:var(--ground-deep)] p-3 font-mono text-xs">
                  {`{
  "blockUnlimitedApprovals": true,
  "maxLossPercent": 50
}`}
                </pre>
              </TabsContent>
            </Tabs>
          </Panel>
        </div>
      </Section>
    </>
  );
}
