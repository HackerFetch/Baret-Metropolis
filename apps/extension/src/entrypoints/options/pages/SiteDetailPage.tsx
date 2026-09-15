import { sites } from "@baret/content";
import { useParams } from "react-router";
import { Page } from "./Page.js";

export function Component() {
  const { origin } = useParams();
  return <Page title={origin ?? sites.title} body={sites.detail.permissions.title} />;
}
