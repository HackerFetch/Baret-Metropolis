import { extOnboarding } from "@baret/content";
import { Page } from "./Page.js";

export function Component() {
  return <Page title={extOnboarding.welcome.title} body={extOnboarding.welcome.body} />;
}
