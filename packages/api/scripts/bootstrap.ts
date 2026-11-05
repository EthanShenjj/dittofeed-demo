import { bootstrapWithDefaults } from "backend-lib/src/bootstrap";

bootstrapWithDefaults({
  workspaceName: process.env.WORKSPACE_NAME ?? "Default",
  workspaceType: "Root",
}).then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
