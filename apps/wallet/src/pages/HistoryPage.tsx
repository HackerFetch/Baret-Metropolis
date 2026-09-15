import { history } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={history.title} body={history.body} />;
}
