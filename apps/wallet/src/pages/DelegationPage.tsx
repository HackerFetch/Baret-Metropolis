import { delegation } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={delegation.title} body={delegation.body} />;
}
