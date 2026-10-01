import { policies } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={policies.title} body={policies.body} />;
}
