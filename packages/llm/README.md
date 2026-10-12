# @baret/llm

One chat client for any provider that speaks the OpenAI chat-completions format. Baret uses it for two things: the Qwen reviewer in [`@baret/agent-kit`](https://www.npmjs.com/package/@baret/agent-kit), which reads an agent's payment before it is signed, and the KIMI explanation the analysis server writes under a verdict.

Most projects do not install this package on their own: `@baret/agent-kit` brings it.

## Install

```
npm install @baret/llm
```

## The smallest working call

```ts
import { KIMI, LlmClient, LlmUnavailableError } from "@baret/llm";
import { z } from "zod";

const client = new LlmClient({ provider: KIMI, apiKey: process.env.KIMI_API_KEY ?? "" });

try {
  const answer = await client.json({
    system: "Answer with a JSON object.",
    user: "Is 0.1 MON more than 0.01 MON? Reply as {\"more\": true|false}.",
    schema: z.object({ more: z.boolean() }),
  });
  console.log(answer.more);
} catch (error) {
  if (error instanceof LlmUnavailableError) {
    // No usable answer: decide what that means for you. Baret's reviewer vetoes.
  } else throw error;
}
```

`QWEN` and `KIMI` are the two provider presets (base URL, model and the provider's own switches); any object of the same shape works for another OpenAI-compatible provider.

## What it does

- `json(request)`: one system and one user message in, one object out, checked against your `zod` schema.
- `agent(request)`: the same, after the model has called your tools for a few turns.

A model's answer is treated as input like any other. When the provider cannot be reached, answers with an error, or returns something the schema refuses, both calls throw `LlmUnavailableError`: the caller never gets a half-read answer.

## Licence

MIT. Source: [HackerFetch/Baret-Metropolis](https://github.com/HackerFetch/Baret-Metropolis/tree/main/packages/llm).
