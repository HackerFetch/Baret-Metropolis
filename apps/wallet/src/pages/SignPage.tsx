import { sign } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={sign.header.title} />;
}
