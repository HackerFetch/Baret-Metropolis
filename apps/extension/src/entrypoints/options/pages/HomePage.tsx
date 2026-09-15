import { optionsHome } from "@baret/content";
import { Page } from "./Page.js";

export function Component() {
  return <Page title={optionsHome.title} body={optionsHome.watched.body} />;
}
