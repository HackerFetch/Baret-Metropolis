import { optionsSettings } from "@baret/content";
import { Page } from "./Page.js";

export function Component() {
  return <Page title={optionsSettings.title} body={optionsSettings.identity.title} />;
}
