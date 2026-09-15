import { receive } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={receive.title} body={receive.body} />;
}
