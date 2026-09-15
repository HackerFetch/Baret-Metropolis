/**
 * @baret/ui
 *
 * Design tokens and the brand primitives that carry the identity. Import the
 * stylesheet once per app, from the app's own entry CSS:
 *
 *   @import "@baret/ui/tokens.css";
 *
 * Everything here is consumed as TypeScript source. There is no build step,
 * so a change here hot-reloads in every app at once.
 */

export type { MarkProps } from "./brand/Mark.js";
export { Mark } from "./brand/Mark.js";
export { cn } from "./cn.js";
export type { TagProps, TagTone } from "./primitives/Tag.js";
export { Tag } from "./primitives/Tag.js";
