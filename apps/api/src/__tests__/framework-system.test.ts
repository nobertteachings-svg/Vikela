import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterFindingsForScope } from "../services/scanner/framework-scope.js";
import { scanHipaaCode, scanPciCode, runFrameworkCodeScans } from "../services/scanner/framework-scans.js";
import { localEmbedText } from "../lib/embeddings.js";

describe("framework-scans", () => {
  it("detects HIPAA SSN patterns", () => {
    const findings = scanHipaaCode("app/patient.ts", "const ssn = '123-45-6789';", []);
    assert.ok(findings.some((f) => f.controlCode === "HIPAA-164.312.e2"));
  });

  it("detects PCI PAN patterns", () => {
    const content = "const pan = '4111111111111111';";
    const findings = scanPciCode("pay.ts", content, []);
    assert.ok(findings.some((f) => f.controlCode === "PCI-3.4"));
  });

  it("runs only enrolled framework scans", () => {
    const content = "const ssn = '123-45-6789';";
    const hipaaOnly = runFrameworkCodeScans(["hipaa"], "f.ts", content, []);
    const pciOnly = runFrameworkCodeScans(["pci-dss"], "f.ts", content, []);
    assert.ok(hipaaOnly.length > 0);
    assert.equal(pciOnly.length, 0);
  });
});

describe("framework-scope", () => {
  it("filters findings to allowed control codes", () => {
    const scope = {
      orgId: "org1",
      frameworkSlugs: ["hipaa"],
      allowedControlCodes: new Set(["HIPAA-164.312.a1", "CC6.1"]),
    };
    const filtered = filterFindingsForScope(
      [
        { controlCode: "CC6.1", title: "a" },
        { controlCode: "PCI-3.4", title: "b" },
        { title: "unmapped" },
      ],
      scope
    );
    assert.equal(filtered.length, 2);
    assert.ok(!filtered.some((f) => f.controlCode === "PCI-3.4"));
  });

  it("passes all findings when no frameworks enrolled", () => {
    const scope = {
      orgId: "org1",
      frameworkSlugs: [],
      allowedControlCodes: new Set<string>(),
    };
    const filtered = filterFindingsForScope([{ controlCode: "CC6.1" }, { controlCode: "PCI-3.4" }], scope);
    assert.equal(filtered.length, 2);
  });
});

describe("local embeddings", () => {
  it("produces normalized vectors", () => {
    const v = localEmbedText("SOC 2 access control MFA");
    assert.equal(v.length, 256);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    assert.ok(Math.abs(norm - 1) < 0.01);
  });
});
