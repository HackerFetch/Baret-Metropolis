import { optionsPolicies } from "@baret/content";
import { Page } from "./Page.js";

export function Component() {
  return <Page title={optionsPolicies.title} body={optionsPolicies.body} />;
}
