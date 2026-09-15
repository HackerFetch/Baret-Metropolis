import { agents } from "@baret/content";
import { Tag } from "@baret/ui";
import { Panel, Section } from "../components/Section.js";

/** /agents. The SDK and CLI page. */
export function Component() {
  return (
    <>
      <header className="grid-paper border-b border-[color:var(--rule)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-5 px-5 py-14 sm:py-20">
          <Tag tone="brand" size="sm">
            {agents.hero.eyebrow}
          </Tag>
          <h1 className="max-w-[18ch] font-stencil text-[clamp(2.5rem,7vw,5rem)] uppercase leading-[0.9]">
            {agents.hero.title}
          </h1>
          <p className="max-w-[62ch] text-xl text-[color:var(--fg-muted)]">{agents.hero.body}</p>
          <code className="chamfer-sm w-max bg-[color:var(--surface)] px-4 py-2.5 font-mono text-sm">
            {agents.hero.install}
          </code>
        </div>
      </header>

      <Section
        index="01"
        eyebrow={agents.problem.eyebrow}
        title={agents.problem.title}
        body={agents.problem.body}
      >
        <ul className="grid gap-3.5 md:grid-cols-3">
          {agents.problem.points.map((point) => (
            <Panel key={point}>
              <p className="text-sm text-[color:var(--fg-muted)]">{point}</p>
            </Panel>
          ))}
        </ul>
      </Section>

      <Section index="02" eyebrow={agents.layers.eyebrow} title={agents.layers.title} deep>
        <div className="grid gap-3.5 md:grid-cols-3">
          {agents.layers.items.map((layer) => (
            <Panel key={layer.title}>
              <h3 className="text-display-m">{layer.title}</h3>
              <p className="text-sm text-[color:var(--fg-muted)]">{layer.body}</p>
              <ul className="mt-1.5 grid gap-1">
                {layer.points.map((point) => (
                  <li key={point} className="font-mono text-xs text-[color:var(--fg-faint)]">
                    {point}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </Section>

      <Section index="03" eyebrow={agents.control.eyebrow} title={agents.control.title}>
        <div className="overflow-x-auto border border-[color:var(--rule)] bg-[color:var(--surface)]">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                {Object.values(agents.control.columns).map((col) => (
                  <th
                    key={col}
                    className="border-b border-[color:var(--rule)] p-3 text-left font-mono text-label uppercase text-[color:var(--fg-faint)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.control.rows.map((row) => (
                <tr key={row.subject}>
                  <th className="border-b border-[color:var(--rule)] p-3 text-left font-display text-base uppercase">
                    {row.subject}
                  </th>
                  <td className="border-b border-[color:var(--rule)] p-3 text-[color:var(--fg-muted)]">
                    {row.who}
                  </td>
                  <td className="border-b border-[color:var(--rule)] p-3 font-mono text-xs text-[color:var(--fg-faint)]">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="quickstart"
        index="04"
        eyebrow={agents.quickstart.eyebrow}
        title={agents.quickstart.title}
        deep
      >
        <div className="grid gap-3.5 md:grid-cols-2">
          <Panel>
            <h3 className="text-display-m">{agents.quickstart.sdk.title}</h3>
            <p className="text-sm text-[color:var(--fg-muted)]">{agents.quickstart.sdk.before}</p>
            <pre className="overflow-x-auto bg-[color:var(--ground-deep)] p-3.5 font-mono text-xs leading-relaxed">
              {`import { AgentWallet } from "@baret/agent-kit";

const agent = AgentWallet.fromSecret(process.env.BARET_AGENT_SECRET, {
  serverUrl: "https://api.baret.dev",
  network: "testnet",
  policy: "balanced",
});

const { hash } = await agent.guardedSubmit(tx);`}
            </pre>
            <p className="text-sm text-[color:var(--fg-faint)]">{agents.quickstart.sdk.after}</p>
          </Panel>
          <Panel>
            <h3 className="text-display-m">{agents.quickstart.cli.title}</h3>
            <p className="text-sm text-[color:var(--fg-muted)]">{agents.quickstart.cli.before}</p>
            <pre className="overflow-x-auto bg-[color:var(--ground-deep)] p-3.5 font-mono text-xs leading-relaxed">
              {`baret init --network testnet --policy balanced
export BARET_AGENT_SECRET=0x...

echo "$TX_JSON" | baret submit -`}
            </pre>
            <p className="text-sm text-[color:var(--fg-faint)]">{agents.quickstart.cli.after}</p>
          </Panel>
        </div>
        <Panel className="mt-3.5">
          <h3 className="text-display-m">{agents.quickstart.secrets.title}</h3>
          <p className="max-w-[70ch] text-sm text-[color:var(--fg-muted)]">
            {agents.quickstart.secrets.body}
          </p>
        </Panel>
      </Section>

      <Section index="05" eyebrow={agents.failClosed.eyebrow} title={agents.failClosed.title}>
        <div className="grid gap-3.5 md:grid-cols-2">
          <Panel>
            <p className="text-[color:var(--fg-muted)]">{agents.failClosed.body}</p>
            <p className="font-mono text-xs text-[color:var(--fg-faint)]">
              {agents.failClosed.note}
            </p>
          </Panel>
          <Panel>
            <h3 className="text-display-m">{agents.revoke.title}</h3>
            <p className="text-sm text-[color:var(--fg-muted)]">{agents.revoke.body}</p>
            <ul className="mt-1.5 grid gap-1">
              {agents.revoke.points.map((point) => (
                <li
                  key={point}
                  className="grid grid-cols-[14px_1fr] gap-2 text-sm text-[color:var(--fg-muted)]"
                >
                  <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                    /
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Section>

      <Section index="06" eyebrow="FAQ" title={agents.faq.title} deep className="border-b-0">
        <div className="max-w-[80ch]">
          {agents.faq.items.map((item) => (
            <details
              key={item.question}
              className="border-t border-[color:var(--rule)] last:border-b"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 py-4 font-display text-xl uppercase tracking-[0.03em]">
                {item.question}
                <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                  +
                </span>
              </summary>
              <p className="max-w-[70ch] pb-5 text-[color:var(--fg-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
