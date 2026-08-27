// Same card as Open Graph. `runtime` has to be declared here rather than
// re-exported — Next reads it statically and will not follow it through a
// re-export, which the production build rejects outright.
export const runtime = "nodejs";

export { alt, contentType, size } from "./opengraph-image";
export { default } from "./opengraph-image";
