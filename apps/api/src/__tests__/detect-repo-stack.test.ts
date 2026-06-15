import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectRepoStack } from "../services/scanner/detect-repo-stack.js";

describe("detectRepoStack", () => {
  it("detects Next.js from next.config", () => {
    assert.equal(detectRepoStack(["package.json", "next.config.ts", "app/page.tsx"]), "nextjs");
  });

  it("detects Node.js from package.json", () => {
    assert.equal(detectRepoStack(["package.json", "src/index.js"]), "nodejs");
  });

  it("detects Python from requirements.txt", () => {
    assert.equal(detectRepoStack(["requirements.txt", "app/main.py"]), "python");
  });

  it("falls back to generic", () => {
    assert.equal(detectRepoStack(["README.md", "LICENSE"]), "generic");
  });

  it("uses directory hints for monorepo nodejs signal", () => {
    assert.equal(
      detectRepoStack(["README.md"], { directoryNames: ["frontend", "backend"] }),
      "nodejs"
    );
  });

  it("uses directory hints for terraform infra", () => {
    assert.equal(
      detectRepoStack(["README.md"], { directoryNames: ["terraform", "modules"] }),
      "terraform"
    );
  });
});
