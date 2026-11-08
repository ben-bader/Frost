// Single source of truth for repo links and local-run instructions.
// Used by the header "Get started" button and the "Run it locally" dialog.

export interface RunStep {
  label: string;
  command: string;
  /** Rendered as a muted note instead of a command block when set. */
  note?: string;
}

export const SITE = {
  repoUrl: "https://github.com/ben-bader/Frost",
  repoName: "Frost",
  requirements: {
    node: "Node.js 22 or newer",
    packageManager: "pnpm 12",
  },
  steps: [
    {
      label: "Get the code",
      command: "git clone https://github.com/ben-bader/Frost.git && cd Frost",
    },
    { label: "Install", command: "pnpm install" },
    { label: "Build", command: "pnpm build" },
    { label: "Run", command: "pnpm --dir examples/starter dev" },
    { label: "Test", command: "pnpm test" },
  ] as RunStep[],
};
