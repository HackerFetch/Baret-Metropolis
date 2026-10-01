import { walletHome } from "@baret/content";
import { Screen } from "../components/Screen.js";

export function Component() {
  return <Screen title={walletHome.balance.label} body={walletHome.banners.testnet} />;
}
