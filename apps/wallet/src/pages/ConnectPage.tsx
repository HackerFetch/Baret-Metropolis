import { connect } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={connect.title} body={connect.subtitle} />;
}
