import { onboarding } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={onboarding.welcome.title} body={onboarding.welcome.body} />;
}
