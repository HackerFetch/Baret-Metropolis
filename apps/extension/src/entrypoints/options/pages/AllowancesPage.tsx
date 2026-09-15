import { optionsAllowances } from "@baret/content";
import { Page } from "./Page.js";

export function Component() {
  return <Page title={optionsAllowances.title} body={optionsAllowances.body} />;
}
