import "../load-env.js";
import { PrismaClient } from "@prisma/client";
import { COMPLIANCE_FRAMEWORKS } from "@vikela/shared/framework-catalog";
import { encrypt } from "../lib/crypto.js";
import { seedFrameworkControlMappings } from "./seed-framework-mappings.js";
import { seedNativeControls } from "./seed-native-controls.js";
import { catalogCreateRows } from "../services/questionnaires/catalog.js";

const prisma = new PrismaClient();

const SOC2_CONTROLS: Array<{
  code: string;
  title: string;
  description: string;
  category: string;
  guidance: string;
  testProcedure: string;
  requirement: string;
}> = [
  { code: "CC1.1", title: "Integrity and ethical values", description: "The entity demonstrates a commitment to integrity and ethical values.", category: "Control Environment", guidance: "Document code of conduct and ethics policy. Train all employees annually.", testProcedure: "Inspect ethics policy and training records.", requirement: "COSO Principle 1" },
  { code: "CC1.2", title: "Board independence and oversight", description: "The board of directors demonstrates independence and exercises oversight.", category: "Control Environment", guidance: "Maintain board charter with independence requirements.", testProcedure: "Review board meeting minutes and charter.", requirement: "COSO Principle 2" },
  { code: "CC1.3", title: "Organizational structure", description: "Management establishes structures, reporting lines, and authorities.", category: "Control Environment", guidance: "Publish org chart and role descriptions with security responsibilities.", testProcedure: "Inspect org chart and job descriptions.", requirement: "COSO Principle 3" },
  { code: "CC1.4", title: "Commitment to competence", description: "The entity demonstrates commitment to attract and retain competent individuals.", category: "Control Environment", guidance: "Define competency requirements for security roles.", testProcedure: "Review hiring criteria and training programs.", requirement: "COSO Principle 4" },
  { code: "CC1.5", title: "Accountability", description: "The entity holds individuals accountable for internal control responsibilities.", category: "Control Environment", guidance: "Include security KPIs in performance reviews.", testProcedure: "Sample performance evaluations.", requirement: "COSO Principle 5" },
  { code: "CC2.1", title: "Internal communication", description: "The entity obtains or generates relevant quality information.", category: "Communication", guidance: "Establish security communication channels and incident reporting.", testProcedure: "Review internal communications and incident reports.", requirement: "COSO Principle 13" },
  { code: "CC2.2", title: "External communication", description: "The entity communicates with external parties regarding matters affecting internal control.", category: "Communication", guidance: "Maintain customer-facing security and privacy notices.", testProcedure: "Review privacy policy and security page.", requirement: "COSO Principle 14" },
  { code: "CC2.3", title: "Lines of communication", description: "The entity communicates information internally including objectives and responsibilities.", category: "Communication", guidance: "Use Slack/email for security announcements.", testProcedure: "Inspect communication logs.", requirement: "COSO Principle 15" },
  { code: "CC3.1", title: "Risk objectives", description: "The entity specifies objectives with sufficient clarity.", category: "Risk Assessment", guidance: "Document risk appetite and security objectives.", testProcedure: "Review risk register and objectives.", requirement: "COSO Principle 6" },
  { code: "CC3.2", title: "Risk identification", description: "The entity identifies risks to achievement of objectives.", category: "Risk Assessment", guidance: "Conduct annual risk assessment workshops.", testProcedure: "Inspect risk assessment documentation.", requirement: "COSO Principle 7" },
  { code: "CC3.3", title: "Fraud risk", description: "The entity considers the potential for fraud in assessing risks.", category: "Risk Assessment", guidance: "Include fraud scenarios in risk assessments.", testProcedure: "Review fraud risk analysis.", requirement: "COSO Principle 8" },
  { code: "CC3.4", title: "Change identification", description: "The entity identifies and assesses changes that could impact internal control.", category: "Risk Assessment", guidance: "Review changes in systems, regulations, and personnel.", testProcedure: "Sample change management tickets.", requirement: "COSO Principle 9" },
  { code: "CC4.1", title: "Ongoing evaluations", description: "The entity selects and develops ongoing evaluations.", category: "Monitoring", guidance: "Run continuous compliance scans and vulnerability assessments.", testProcedure: "Review scan results and monitoring dashboards.", requirement: "COSO Principle 16" },
  { code: "CC4.2", title: "Deficiency communication", description: "The entity evaluates and communicates internal control deficiencies.", category: "Monitoring", guidance: "Track gaps in ticketing system with SLA.", testProcedure: "Inspect gap remediation tickets.", requirement: "COSO Principle 17" },
  { code: "CC5.1", title: "Control activities selection", description: "The entity selects and develops control activities.", category: "Control Activities", guidance: "Map controls to risks and implement mitigations.", testProcedure: "Review control matrix.", requirement: "COSO Principle 10" },
  { code: "CC5.2", title: "Technology controls", description: "The entity selects and develops general control activities over technology.", category: "Control Activities", guidance: "Implement change management, access control, and backup procedures.", testProcedure: "Test IT general controls.", requirement: "COSO Principle 11" },
  { code: "CC5.3", title: "Policies and procedures", description: "The entity deploys control activities through policies and procedures.", category: "Control Activities", guidance: "Maintain policy library with annual review cycle.", testProcedure: "Sample policies and approval records.", requirement: "COSO Principle 12" },
  { code: "CC6.1", title: "Logical access security", description: "The entity implements logical access security software and infrastructure.", category: "Access Control", guidance: "Use SSO/MFA for all production systems. Enforce least privilege.", testProcedure: "Review access control lists and MFA enrollment.", requirement: "Logical and Physical Access Controls" },
  { code: "CC6.2", title: "User registration and authorization", description: "Prior to issuing credentials, the entity registers and authorizes users.", category: "Access Control", guidance: "Require manager approval for new access requests.", testProcedure: "Sample access provisioning tickets.", requirement: "Logical and Physical Access Controls" },
  { code: "CC6.3", title: "User removal", description: "The entity removes access when no longer required.", category: "Access Control", guidance: "Automate deprovisioning on HR offboarding events.", testProcedure: "Review terminated user access removal within 24h.", requirement: "Logical and Physical Access Controls" },
  { code: "CC6.4", title: "Physical access restrictions", description: "The entity restricts physical access to facilities and assets.", category: "Access Control", guidance: "Use cloud provider physical security; restrict office access.", testProcedure: "Review data center SOC reports.", requirement: "Logical and Physical Access Controls" },
  { code: "CC6.5", title: "Data disposal", description: "The entity discontinues logical and physical protections over physical assets.", category: "Access Control", guidance: "Securely wipe devices and destroy media.", testProcedure: "Inspect disposal certificates.", requirement: "Logical and Physical Access Controls" },
  { code: "CC6.6", title: "External threats", description: "The entity implements controls to prevent unauthorized access from outside.", category: "Access Control", guidance: "Deploy WAF, DDoS protection, and network segmentation.", testProcedure: "Review firewall rules and penetration test results.", requirement: "Logical and Physical Access Controls" },
  { code: "CC6.7", title: "Transmission security", description: "The entity restricts transmission of data to authorized parties.", category: "Encryption", guidance: "Enforce TLS 1.2+ for all data in transit.", testProcedure: "Scan endpoints for TLS configuration.", requirement: "Logical and Physical Access Controls" },
  { code: "CC6.8", title: "Malware prevention", description: "The entity implements controls to prevent malicious software.", category: "Access Control", guidance: "Use endpoint protection on employee devices.", testProcedure: "Verify EDR deployment coverage.", requirement: "Logical and Physical Access Controls" },
  { code: "CC7.1", title: "Detection and monitoring", description: "The entity uses detection and monitoring procedures.", category: "System Operations", guidance: "Centralize logs in SIEM with alerting on anomalies.", testProcedure: "Review alerting rules and incident tickets.", requirement: "System Operations" },
  { code: "CC7.2", title: "Anomaly monitoring", description: "The entity monitors system components for anomalies.", category: "System Operations", guidance: "Set up CloudWatch/Datadog monitors for critical metrics.", testProcedure: "Inspect monitoring dashboards.", requirement: "System Operations" },
  { code: "CC7.3", title: "Incident evaluation", description: "The entity evaluates security events to determine incidents.", category: "Incident Response", guidance: "Define incident severity matrix and escalation paths.", testProcedure: "Review incident response runbooks.", requirement: "System Operations" },
  { code: "CC7.4", title: "Incident response", description: "The entity responds to identified security incidents.", category: "Incident Response", guidance: "Maintain incident response plan with tabletop exercises.", testProcedure: "Review incident tickets and postmortems.", requirement: "System Operations" },
  { code: "CC7.5", title: "Incident recovery", description: "The entity identifies and addresses vulnerabilities from incidents.", category: "Incident Response", guidance: "Track remediation actions from incidents to closure.", testProcedure: "Sample incident closure documentation.", requirement: "System Operations" },
  { code: "CC8.1", title: "Change management", description: "The entity authorizes, designs, develops, and implements changes.", category: "Change Management", guidance: "Require PR reviews and CI checks before merge.", testProcedure: "Sample change tickets and PR approvals.", requirement: "Change Management" },
  { code: "CC9.1", title: "Risk mitigation", description: "The entity identifies and mitigates business disruption risks.", category: "Risk Mitigation", guidance: "Maintain BCP/DR plan with annual testing.", testProcedure: "Review BCP documentation and test results.", requirement: "Risk Mitigation" },
  { code: "CC9.2", title: "Vendor risk", description: "The entity assesses and manages risks from vendors.", category: "Vendor Management", guidance: "Maintain vendor inventory with risk ratings and SOC reports.", testProcedure: "Review vendor assessment records.", requirement: "Risk Mitigation" },
  { code: "A1.1", title: "Capacity planning", description: "The entity maintains capacity to meet availability commitments.", category: "Availability", guidance: "Monitor resource utilization and auto-scale.", testProcedure: "Review capacity planning documentation.", requirement: "Availability" },
  { code: "A1.2", title: "Environmental protections", description: "The entity authorizes and implements environmental protections.", category: "Availability", guidance: "Use multi-AZ deployment and redundant infrastructure.", testProcedure: "Review architecture diagrams.", requirement: "Availability" },
  { code: "A1.3", title: "Recovery testing", description: "The entity tests recovery plan procedures.", category: "Availability", guidance: "Conduct quarterly DR failover tests.", testProcedure: "Inspect DR test reports.", requirement: "Availability" },
  { code: "C1.1", title: "Confidential information identification", description: "The entity identifies and maintains confidential information.", category: "Confidentiality", guidance: "Classify data and label sensitive assets.", testProcedure: "Review data classification policy.", requirement: "Confidentiality" },
  { code: "C1.2", title: "Confidential information disposal", description: "The entity disposes of confidential information.", category: "Confidentiality", guidance: "Implement secure deletion for customer data.", testProcedure: "Test data deletion workflows.", requirement: "Confidentiality" },
  { code: "PI1.1", title: "Processing completeness", description: "The entity obtains data for processing completeness.", category: "Processing Integrity", guidance: "Validate input data and processing outputs.", testProcedure: "Review data validation controls.", requirement: "Processing Integrity" },
  { code: "PI1.2", title: "Processing accuracy", description: "The entity implements policies for processing accuracy.", category: "Processing Integrity", guidance: "Implement reconciliation and error handling.", testProcedure: "Sample processing error logs.", requirement: "Processing Integrity" },
  { code: "P1.1", title: "Privacy notice", description: "The entity provides notice about privacy practices.", category: "Privacy", guidance: "Publish privacy policy aligned with GDPR/CCPA.", testProcedure: "Review privacy policy.", requirement: "Privacy" },
  { code: "P2.1", title: "Choice and consent", description: "The entity communicates choices available regarding collection.", category: "Privacy", guidance: "Implement consent mechanisms for marketing data.", testProcedure: "Test consent flows.", requirement: "Privacy" },
  { code: "P3.1", title: "Personal information collection", description: "The entity collects personal information consistent with objectives.", category: "Privacy", guidance: "Minimize data collection to necessary fields.", testProcedure: "Review data collection forms.", requirement: "Privacy" },
  { code: "P4.1", title: "Personal information use", description: "The entity limits use of personal information.", category: "Privacy", guidance: "Document purpose limitation in privacy policy.", testProcedure: "Review data usage logs.", requirement: "Privacy" },
  { code: "P5.1", title: "Personal information retention", description: "The entity retains personal information consistent with objectives.", category: "Privacy", guidance: "Define retention schedules and automated deletion.", testProcedure: "Review retention policy.", requirement: "Privacy" },
  { code: "P6.1", title: "Personal information disclosure", description: "The entity discloses personal information only with consent.", category: "Privacy", guidance: "Maintain subprocessors list and DPAs.", testProcedure: "Review subprocessor agreements.", requirement: "Privacy" },
  { code: "P7.1", title: "Personal information quality", description: "The entity maintains accurate personal information.", category: "Privacy", guidance: "Allow users to update profile data.", testProcedure: "Test data correction workflows.", requirement: "Privacy" },
  { code: "P8.1", title: "Privacy inquiry handling", description: "The entity responds to privacy inquiries and requests.", category: "Privacy", guidance: "Process DSARs within regulatory timelines.", testProcedure: "Sample DSAR response records.", requirement: "Privacy" },
];

async function main() {
  console.log("Seeding Vikela database...");

  for (const fw of COMPLIANCE_FRAMEWORKS) {
    await prisma.framework.upsert({
      where: { slug: fw.slug },
      update: { name: fw.name, description: fw.description, version: fw.version },
      create: {
        name: fw.name,
        slug: fw.slug,
        description: fw.description,
        version: fw.version,
      },
    });
  }

  const soc2 = await prisma.framework.findUniqueOrThrow({ where: { slug: "soc2" } });

  for (const ctrl of SOC2_CONTROLS) {
    const control = await prisma.control.upsert({
      where: { code: ctrl.code },
      update: {},
      create: {
        code: ctrl.code,
        title: ctrl.title,
        description: ctrl.description,
        category: ctrl.category,
        guidance: ctrl.guidance,
        testProcedure: ctrl.testProcedure,
      },
    });

    await prisma.controlFramework.upsert({
      where: {
        controlId_frameworkId: { controlId: control.id, frameworkId: soc2.id },
      },
      update: {},
      create: {
        controlId: control.id,
        frameworkId: soc2.id,
        requirement: ctrl.requirement,
      },
    });
  }

  console.log("Seeding cross-framework control mappings...");
  await seedFrameworkControlMappings();

  console.log("Seeding framework-native controls...");
  const nativeCount = await seedNativeControls();
  console.log(`  ${nativeCount} native controls seeded.`);

  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Acme Startup",
      slug: "demo",
      clerkOrgId: "org_demo_vikela",
      plan: "STARTER",
    },
  });

  await prisma.orgFramework.upsert({
    where: { orgId_frameworkId: { orgId: org.id, frameworkId: soc2.id } },
    update: {},
    create: {
      orgId: org.id,
      frameworkId: soc2.id,
      status: "IN_PROGRESS",
      score: 68,
    },
  });

  const allControls = await prisma.control.findMany({ where: { frameworks: { some: { frameworkId: soc2.id } } } });
  const statuses = ["IMPLEMENTED", "IMPLEMENTED", "IN_PROGRESS", "NOT_STARTED", "NEEDS_REVIEW"] as const;

  for (let i = 0; i < allControls.length; i++) {
    const status = statuses[i % statuses.length];
    await prisma.orgControl.upsert({
      where: { orgId_controlId: { orgId: org.id, controlId: allControls[i].id } },
      update: { status },
      create: { orgId: org.id, controlId: allControls[i].id, status },
    });
  }

  const cc61 = await prisma.control.findUnique({ where: { code: "CC6.1" } });
  const cc67 = await prisma.control.findUnique({ where: { code: "CC6.7" } });
  const cc71 = await prisma.control.findUnique({ where: { code: "CC7.1" } });

  const demoToken = encrypt("demo-github-token");

  const githubIntegration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GITHUB",
        externalId: "inst_demo",
      },
    },
    // Seed stubs stay inactive so they never consume plan slots or break Sync with fake tokens.
    update: { isActive: false, accessToken: demoToken },
    create: {
      orgId: org.id,
      provider: "GITHUB",
      category: "GIT",
      name: "Acme GitHub",
      externalId: "inst_demo",
      accessToken: demoToken,
      scopes: ["repo", "read:org"],
      isActive: false,
    },
  });

  const awsIntegration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "AWS",
        externalId: "123456789012",
      },
    },
    update: { isActive: false },
    create: {
      orgId: org.id,
      provider: "AWS",
      category: "CLOUD",
      name: "Acme AWS Production",
      externalId: "123456789012",
      accessToken: encrypt("assume-role-only"),
      scopes: [],
      metadata: { roleArn: "arn:aws:iam::123456789012:role/VikelaScanner" },
      isActive: false,
    },
  });

  const azureAdIntegration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "AZURE_AD",
        externalId: "tenant_demo",
      },
    },
    update: { isActive: false },
    create: {
      orgId: org.id,
      provider: "AZURE_AD",
      category: "IDENTITY",
      name: "Acme Azure AD",
      externalId: "tenant_demo",
      accessToken: demoToken,
      scopes: ["User.Read.All", "AuditLog.Read.All"],
      isActive: false,
    },
  });

  const azureCloudIntegration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "AZURE",
        externalId: "demo-subscription",
      },
    },
    update: { isActive: false, accessToken: demoToken },
    create: {
      orgId: org.id,
      provider: "AZURE",
      category: "CLOUD",
      name: "Acme Azure Subscription",
      externalId: "demo-subscription",
      accessToken: demoToken,
      metadata: { subscriptionId: "demo-subscription", purpose: "cloud" },
      isActive: false,
    },
  });

  const gcpIntegration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GCP",
        externalId: "demo-gcp-project",
      },
    },
    update: { isActive: false, accessToken: demoToken },
    create: {
      orgId: org.id,
      provider: "GCP",
      category: "CLOUD",
      name: "Acme GCP Project",
      externalId: "demo-gcp-project",
      accessToken: demoToken,
      metadata: { projectId: "demo-gcp-project" },
      isActive: false,
    },
  });

  const repo = await prisma.repository.upsert({
    where: {
      integrationId_externalId: {
        integrationId: githubIntegration.id,
        externalId: "123456",
      },
    },
    update: {},
    create: {
      orgId: org.id,
      integrationId: githubIntegration.id,
      externalId: "123456",
      name: "backend",
      fullName: "acme/backend",
      cloneUrl: "https://github.com/acme/backend.git",
      defaultBranch: "main",
      isPrivate: true,
    },
  });

  const cloudAccount = await prisma.cloudAccount.upsert({
    where: {
      orgId_provider_accountId: {
        orgId: org.id,
        provider: "AWS",
        accountId: "123456789012",
      },
    },
    update: { isActive: false },
    create: {
      orgId: org.id,
      integrationId: awsIntegration.id,
      provider: "AWS",
      accountId: "123456789012",
      accountName: "Acme Production",
      region: "us-east-1",
      environment: "PRODUCTION",
      isActive: false,
    },
  });

  await prisma.cloudAccount.upsert({
    where: {
      orgId_provider_accountId: {
        orgId: org.id,
        provider: "AZURE",
        accountId: "demo-subscription",
      },
    },
    update: { isActive: false },
    create: {
      orgId: org.id,
      integrationId: azureCloudIntegration.id,
      provider: "AZURE",
      accountId: "demo-subscription",
      accountName: "Acme Azure",
      region: "global",
      isActive: false,
    },
  });

  await prisma.cloudAccount.upsert({
    where: {
      orgId_provider_accountId: {
        orgId: org.id,
        provider: "GCP",
        accountId: "demo-gcp-project",
      },
    },
    update: { isActive: false },
    create: {
      orgId: org.id,
      integrationId: gcpIntegration.id,
      provider: "GCP",
      accountId: "demo-gcp-project",
      accountName: "Acme GCP",
      region: "global",
      isActive: false,
    },
  });

  const codeScan = await prisma.scan.create({
    data: {
      orgId: org.id,
      integrationId: githubIntegration.id,
      repoId: repo.id,
      scanType: "CODE",
      branch: "main",
      status: "COMPLETED",
      score: 62,
      totalChecks: 40,
      passedChecks: 25,
      completedAt: new Date(),
    },
  });

  const cloudScan = await prisma.scan.create({
    data: {
      orgId: org.id,
      integrationId: awsIntegration.id,
      cloudAccountId: cloudAccount.id,
      scanType: "CLOUD",
      status: "COMPLETED",
      score: 55,
      totalChecks: 20,
      passedChecks: 11,
      completedAt: new Date(),
    },
  });

  const demoGaps = [
    {
      title: "Hardcoded API key detected",
      description: "A potential secret was found in source code that may be committed to version control.",
      severity: "CRITICAL" as const,
      source: "CODE" as const,
      filePath: "src/config/database.ts",
      lineNumber: 14,
      codeSnippet: 'const API_KEY = "sk-live-xxxxxxxxxxxx"',
      remediation: "Remove the hardcoded key immediately. Rotate the compromised credential. Store secrets in environment variables or a secrets manager (AWS Secrets Manager, Vault). Add a pre-commit hook with gitleaks.",
      controlId: cc61?.id,
      repoId: repo.id,
      scanId: codeScan.id,
    },
    {
      title: "Database connection without TLS",
      description: "PostgreSQL connection string does not enforce SSL mode.",
      severity: "HIGH" as const,
      source: "ENCRYPTION" as const,
      filePath: "src/db/client.ts",
      lineNumber: 8,
      codeSnippet: "ssl: false",
      remediation: "Set ssl: { rejectUnauthorized: true } in production. Update DATABASE_URL to include ?sslmode=require. Maps to CC6.7 transmission security.",
      controlId: cc67?.id,
      repoId: repo.id,
      scanId: codeScan.id,
    },
    {
      title: "Missing audit logging on auth endpoints",
      description: "Authentication routes do not emit structured security logs.",
      severity: "HIGH" as const,
      source: "LOGGING" as const,
      filePath: "src/routes/auth.ts",
      lineNumber: 42,
      codeSnippet: "// TODO: add logging",
      remediation: "Log all login attempts (success/failure), lockouts, and password resets with timestamp, IP, and user ID. Ship logs to your SIEM. Maps to CC7.1.",
      controlId: cc71?.id,
      repoId: repo.id,
      scanId: codeScan.id,
    },
    {
      title: "Vulnerable dependency: lodash < 4.17.21",
      description: "npm audit reports prototype pollution vulnerability in lodash.",
      severity: "MEDIUM" as const,
      source: "CODE" as const,
      filePath: "package.json",
      lineNumber: null,
      codeSnippet: '"lodash": "4.17.15"',
      remediation: "Run npm audit fix or upgrade lodash to >= 4.17.21. Enable Dependabot for automated PRs.",
      controlId: cc61?.id,
      repoId: repo.id,
      scanId: codeScan.id,
    },
    {
      title: "CloudTrail not enabled in all regions",
      description: "AWS CloudTrail is required for audit logging under SOC 2 CC7.1.",
      severity: "HIGH" as const,
      source: "LOGGING" as const,
      cloudProvider: "AWS" as const,
      resourceType: "CloudTrail",
      resourceId: "account-wide",
      region: "all",
      remediation: "Enable CloudTrail in all regions with log file validation and S3 delivery.",
      controlId: cc71?.id,
      cloudAccountId: cloudAccount.id,
      scanId: cloudScan.id,
    },
    {
      title: 'S3 bucket "acme-evidence" allows public access',
      description: "Public S3 buckets can expose sensitive customer and audit data.",
      severity: "CRITICAL" as const,
      source: "ENCRYPTION" as const,
      cloudProvider: "AWS" as const,
      resourceType: "S3Bucket",
      resourceId: "acme-evidence",
      region: "us-east-1",
      remediation: "Enable S3 Block Public Access. Use presigned URLs for evidence access.",
      controlId: cc61?.id,
      cloudAccountId: cloudAccount.id,
      scanId: cloudScan.id,
    },
    {
      title: "3 IAM users without MFA",
      description: "Users without MFA increase account takeover risk.",
      severity: "HIGH" as const,
      source: "IAM" as const,
      cloudProvider: "AWS" as const,
      resourceType: "IAMUser",
      resourceId: "multiple",
      region: "global",
      remediation: "Enforce MFA for all IAM users via IAM policy.",
      controlId: cc61?.id,
      cloudAccountId: cloudAccount.id,
      scanId: cloudScan.id,
    },
    {
      title: "Security group allows 0.0.0.0/0 on port 22",
      description: "SSH open to the internet increases brute-force exposure.",
      severity: "HIGH" as const,
      source: "NETWORK" as const,
      cloudProvider: "AWS" as const,
      resourceType: "SecurityGroup",
      resourceId: "sg-0abc123def456",
      region: "us-east-1",
      remediation: "Restrict SSH to bastion host IP or use AWS Systems Manager Session Manager.",
      controlId: cc61?.id,
      cloudAccountId: cloudAccount.id,
      scanId: cloudScan.id,
    },
  ];

  await prisma.gap.deleteMany({ where: { orgId: org.id } });
  for (const gap of demoGaps) {
    await prisma.gap.create({
      data: {
        orgId: org.id,
        ...gap,
      },
    });
  }

  await prisma.orgFramework.update({
    where: { orgId_frameworkId: { orgId: org.id, frameworkId: soc2.id } },
    data: { score: 58 },
  });

  const ocCc61 = cc61
    ? await prisma.orgControl.findUnique({
        where: { orgId_controlId: { orgId: org.id, controlId: cc61.id } },
      })
    : null;
  const ocCc71 = cc71
    ? await prisma.orgControl.findUnique({
        where: { orgId_controlId: { orgId: org.id, controlId: cc71.id } },
      })
    : null;

  await prisma.policy.deleteMany({ where: { orgId: org.id } });
  await prisma.policy.createMany({
    data: [
      {
        orgId: org.id,
        title: "Access Control Policy",
        type: "ACCESS_CONTROL",
        status: "APPROVED",
        content: `# Access Control Policy\n\n**Organization:** ${org.name}\n\n## MFA\nAll production systems require MFA.\n\n## Access reviews\nQuarterly access reviews for all privileged accounts.`,
      },
      {
        orgId: org.id,
        title: "Incident Response Plan",
        type: "INCIDENT_RESPONSE",
        status: "REVIEW",
        content: `# Incident Response Plan\n\n**Organization:** ${org.name}\n\n## Severity levels\nP1–P4 defined with 15-minute escalation for P1.`,
      },
      {
        orgId: org.id,
        title: "Change Management Policy",
        type: "CHANGE_MANAGEMENT",
        status: "DRAFT",
        content: `# Change Management Policy\n\n**Organization:** ${org.name}\n\n## Pull requests\nAll production changes require PR review and CI pass.`,
      },
      {
        orgId: org.id,
        title: "Data Retention & Disposal Policy",
        type: "DATA_RETENTION",
        status: "DRAFT",
        content: `# Data Retention Policy\n\n**Organization:** ${org.name}\n\n## Customer data\nDeleted within 30 days of contract termination.`,
      },
    ],
  });

  await prisma.evidence.deleteMany({ where: { orgId: org.id } });
  await prisma.evidence.createMany({
    data: [
      {
        orgId: org.id,
        title: "Okta MFA enrollment screenshot",
        description: "Admin console showing MFA policy enforced for all users",
        type: "SCREENSHOT",
        source: "MANUAL",
        controlId: ocCc61?.id,
        isAutoCollected: false,
      },
      {
        orgId: org.id,
        title: "CloudTrail log sample (7 days)",
        description: "Exported management events for auditor sampling",
        type: "LOG",
        source: "AUTO_AWS",
        controlId: ocCc71?.id,
        isAutoCollected: true,
      },
    ],
  });

  await prisma.member.deleteMany({ where: { orgId: org.id } });
  await prisma.member.createMany({
    data: [
      {
        orgId: org.id,
        clerkId: "user_demo_sarah",
        email: "sarah@acme.io",
        name: "Sarah Chen",
        role: "ADMIN",
      },
      {
        orgId: org.id,
        clerkId: "user_demo_marcus",
        email: "eng@acme.io",
        name: "Marcus Webb",
        role: "MEMBER",
      },
      {
        orgId: org.id,
        clerkId: "user_demo_priya",
        email: "devops@acme.io",
        name: "Priya Patel",
        role: "MEMBER",
      },
      {
        orgId: org.id,
        clerkId: "user_demo_alex",
        email: "alex@acme.io",
        name: "Alex Rivera",
        role: "AUDITOR",
      },
    ],
  });

  await prisma.vendor.deleteMany({ where: { orgId: org.id } });
  await prisma.vendor.createMany({
    data: [
      {
        orgId: org.id,
        name: "AWS",
        website: "https://aws.amazon.com",
        category: "Cloud infrastructure",
        riskLevel: "LOW",
        reviewStatus: "APPROVED",
        lastReviewed: new Date("2025-01-15"),
        notes: "SOC 2 Type II on file",
        owner: "Platform",
        dataAccess: "Infrastructure metadata",
        contractRenewal: new Date("2026-01-15"),
        score: 92,
        questionnaireStatus: "Approved — annual review complete",
        documents: ["SOC 2 Type II report", "Pen test summary"],
        subprocessors: ["Amazon data centers"],
        dataProcessing: true,
        soc2Certified: true,
      },
      {
        orgId: org.id,
        name: "Stripe",
        website: "https://stripe.com",
        category: "Payments",
        riskLevel: "LOW",
        reviewStatus: "APPROVED",
        lastReviewed: new Date("2025-03-10"),
        owner: "Finance",
        dataAccess: "Payment tokens",
        contractRenewal: new Date("2025-12-01"),
        score: 88,
        questionnaireStatus: "Approved",
        documents: ["SOC 2", "PCI attestation"],
        subprocessors: [],
        dataProcessing: true,
        soc2Certified: true,
      },
      {
        orgId: org.id,
        name: "GitHub",
        website: "https://github.com",
        category: "Dev tooling",
        riskLevel: "LOW",
        reviewStatus: "APPROVED",
        lastReviewed: new Date("2025-04-22"),
        owner: "Engineering",
        dataAccess: "Source code",
        contractRenewal: new Date("2026-04-01"),
        score: 90,
        questionnaireStatus: "Approved",
        documents: ["SOC 2"],
        subprocessors: [],
        dataProcessing: false,
        soc2Certified: true,
      },
      {
        orgId: org.id,
        name: "Notion",
        website: "https://notion.so",
        category: "Productivity",
        riskLevel: "MEDIUM",
        reviewStatus: "IN_REVIEW",
        lastReviewed: new Date("2025-02-01"),
        owner: "Operations",
        dataAccess: "Internal docs",
        contractRenewal: new Date("2025-08-01"),
        score: 65,
        questionnaireStatus: "In progress — security review pending",
        documents: [],
        subprocessors: [],
        dataProcessing: false,
        soc2Certified: false,
      },
    ],
  });

  await prisma.risk.deleteMany({ where: { orgId: org.id } });
  const riskReview = new Date();
  riskReview.setUTCDate(riskReview.getUTCDate() + 90);
  await prisma.risk.createMany({
    data: [
      {
        orgId: org.id,
        title: "Customer data breach",
        description: "Unauthorized access to customer PII in production databases or backups.",
        category: "Security",
        likelihood: 2,
        impact: 3,
        score: 6,
        status: "OPEN",
        mitigation: "Encryption at rest, access controls, monitoring, annual pentest",
        nextReviewAt: riskReview,
      },
      {
        orgId: org.id,
        title: "Insider threat",
        description: "Malicious or negligent access by employees with production permissions.",
        category: "Security",
        likelihood: 1,
        impact: 3,
        score: 3,
        status: "MITIGATED",
        mitigation: "Quarterly access reviews, least privilege IAM, offboarding checklist",
        nextReviewAt: riskReview,
      },
      {
        orgId: org.id,
        title: "Third-party vendor outage",
        description: "Critical SaaS dependency unavailable during audit window.",
        category: "Third-party",
        likelihood: 2,
        impact: 2,
        score: 4,
        status: "OPEN",
        mitigation: "Vendor SLAs, status page monitoring, backup communication channels",
        nextReviewAt: riskReview,
      },
    ],
  });

  await prisma.trainingModule.deleteMany({ where: { orgId: org.id } });
  await prisma.trainingAssignment.deleteMany({ where: { orgId: org.id } });
  await prisma.trainingModule.createMany({
    data: [
      {
        orgId: org.id,
        name: "Security awareness",
        description:
          "Annual security training covering phishing, passwords, and incident reporting.",
        framework: "SOC 2 CC1.4",
        durationMin: 45,
        dueAt: new Date("2025-06-01"),
        completed: 5,
        assigned: 6,
        status: "ON_TRACK",
      },
      {
        orgId: org.id,
        name: "HIPAA basics",
        description:
          "PHI handling, minimum necessary rule, and breach notification for healthcare customers.",
        framework: "HIPAA §164.530",
        durationMin: 60,
        dueAt: new Date("2025-06-15"),
        completed: 3,
        assigned: 6,
        status: "AT_RISK",
      },
      {
        orgId: org.id,
        name: "Phishing simulation",
        description: "Quarterly simulated phishing campaigns with remedial training.",
        framework: "SOC 2 CC1.4",
        durationMin: 20,
        dueAt: new Date("2025-05-30"),
        completed: 6,
        assigned: 6,
        status: "COMPLETE",
      },
    ],
  });

  const members = await prisma.member.findMany({ where: { orgId: org.id } });
  const modules = await prisma.trainingModule.findMany({ where: { orgId: org.id } });
  if (members.length > 0 && modules.length > 0) {
    await prisma.trainingAssignment.createMany({
      data: members.flatMap((member, mi) =>
        modules.map((mod, modi) => ({
          orgId: org.id,
          memberId: member.id,
          moduleId: mod.id,
          status:
            modi === 2
              ? ("COMPLETE" as const)
              : mi === 0 && modi === 1
                ? ("OVERDUE" as const)
                : modi === 0
                  ? ("IN_PROGRESS" as const)
                  : ("NOT_STARTED" as const),
          completedAt: modi === 2 ? new Date() : null,
        }))
      ),
    });
  }

  await prisma.questionnaire.deleteMany({ where: { orgId: org.id } });
  {
    const rows = catalogCreateRows();
    const approvedThrough = Math.floor(rows.length / 3);
    await prisma.questionnaire.create({
      data: {
        orgId: org.id,
        title: "Enterprise vendor security questionnaire",
        status: "IN_REVIEW",
        items: {
          create: rows.map((row, idx) => ({
            ...row,
            status: idx < approvedThrough ? ("APPROVED" as const) : ("PENDING" as const),
            finalAnswer: idx < approvedThrough ? row.suggestedAnswer : null,
          })),
        },
      },
    });
  }

  const { ingestOrgKnowledge } = await import("../services/rag/ingest.js");
  const chunks = await ingestOrgKnowledge(org.id);

  console.log(
    `Seeded ${SOC2_CONTROLS.length} controls, integrations, ${demoGaps.length} gaps, members, vendors, risks, policies, evidence, ${chunks} knowledge chunks.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
