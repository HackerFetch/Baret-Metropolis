import { docs } from "@baret/content";

/**
 * The docs page's pure pieces: the anchor of each group and the GitHub URL
 * of each card's file. The repository URL is the one already in the copy
 * (the hero's "View the source"), so a move of the repo is one edit.
 */

/** "Contracts and payments" -> "contracts-and-payments". /agents links to that anchor. */
export function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const REPO = docs.hero.actions.secondary.href.replace(/\/+$/, "");

/** "docs/ARCHITECTURE.md" -> the file on the main branch on GitHub. */
export function fileUrl(file: string, repo: string = REPO): string {
  return `${repo}/blob/main/${file.replace(/^\/+/, "")}`;
}

/** "docs/ARCHITECTURE.md" -> "ARCHITECTURE.md", for the card's mono foot. */
export function fileName(file: string): string {
  return file.split("/").pop() ?? file;
}
