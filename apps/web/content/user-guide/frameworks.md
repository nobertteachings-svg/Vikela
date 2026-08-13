# Frameworks

**Path:** Sidebar → **Frameworks** (`/frameworks`)  
**Who:** Admin, Member, Auditor (view). Enrollment/management is for operators with write access.

## Purpose

Enroll and monitor compliance frameworks. Vikela maps scan findings and evidence to framework controls so you can track **readiness** toward audit goals (SOC 2, ISO 27001, HIPAA, and others).

## Catalog (typical)

Frameworks available in product catalog include:

- SOC 2, SOC 1, SOC 3  
- HIPAA  
- ISO 27001, ISO 42001  
- GDPR  
- PCI-DSS  
- FedRAMP, CMMC  

Exact availability depends on seeding/catalog version.

## Navigation and primary workflows

1. Open **Frameworks**.
2. Review enrolled frameworks: readiness/score, control coverage.
3. **Enroll** a framework you are pursuing.
4. Drill into controls for that framework (see [Controls](./controls.md)).
5. Use open gaps and evidence coverage to raise readiness.

> **Screenshot:** Frameworks list with readiness percentages

## Field / status meanings

| Concept | Meaning |
|---------|---------|
| **Enrolled** | Org is actively tracking this framework |
| **Readiness / score** | Aggregate posture from related controls (gaps and evidence influence this) |
| **Control count** | Number of controls mapped under the framework |

## Related entities

- [Controls](./controls.md), library filtered by framework  
- [Gaps and findings](./gaps-and-findings.md), drive failing controls  
- [Evidence](./evidence.md), supports control coverage  
- [Policies](./policies.md), publish policies mapped to frameworks  
- [Trust](./getting-started.md#trust-center), public view of enrolled frameworks  

## Role notes

| Role | Notes |
|------|-------|
| Admin / Member | Enroll and operate toward readiness |
| Auditor | Review readiness; cannot manage integrations that feed scores |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Score stuck low | Close/resolve gaps; attach evidence to failing controls |
| Framework missing | Confirm catalog seed; contact operator |
| No progress after scan | Ensure findings map to enrolled framework controls |

Back to [User guide index](./README.md).
