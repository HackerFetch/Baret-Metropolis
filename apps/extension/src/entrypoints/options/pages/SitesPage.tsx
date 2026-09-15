import { sites } from "@baret/content";
import { Page } from "./Page.js";

export function Component() {
  return <Page title={sites.title} body={sites.body} />;
}
