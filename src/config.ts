import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-five-second-rule",
  breadcrumbs: false,
  displayName: "Five Second Rule",
  visualProfile: "play",
  shellLayout: "inset",
  description: "A fast, peer-to-peer answer game where every voice gets five seconds.",
  accentHex: "#ea580c",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
