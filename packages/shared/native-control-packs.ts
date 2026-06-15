/** Framework-native control definitions — unique requirement IDs per standard. */
export type NativeControlDef = {
  code: string;
  title: string;
  description: string;
  category: string;
  guidance: string;
  testProcedure: string;
  /** Canonical scanner control codes that satisfy this native control when gap-free. */
  autoSatisfiedBy?: string[];
};

function pack(controls: NativeControlDef[]): NativeControlDef[] {
  return controls;
}

export const NATIVE_CONTROL_PACKS: Record<string, NativeControlDef[]> = {
  hipaa: pack([
    { code: "HIPAA-164.308.a1", title: "Security management process", description: "Implement policies to prevent, detect, contain, and correct security violations.", category: "Administrative", guidance: "Maintain written security policies reviewed annually.", testProcedure: "Review security policy and risk analysis records.", autoSatisfiedBy: ["CC3.1", "CC3.2"] },
    { code: "HIPAA-164.308.a3", title: "Workforce security", description: "Ensure workforce members have appropriate access and terminate access when employment ends.", category: "Administrative", guidance: "Document authorization and termination procedures.", testProcedure: "Sample access provisioning and deprovisioning tickets.", autoSatisfiedBy: ["CC6.2", "CC6.3"] },
    { code: "HIPAA-164.308.a5", title: "Security awareness training", description: "Train workforce on security awareness and malware protection.", category: "Administrative", guidance: "Annual HIPAA security training for all staff.", testProcedure: "Review training completion records.", autoSatisfiedBy: ["CC1.4"] },
    { code: "HIPAA-164.308.a6", title: "Security incident procedures", description: "Identify, respond to, and mitigate security incidents.", category: "Administrative", guidance: "Maintain incident response plan with breach notification steps.", testProcedure: "Review IR plan and sample incident tickets.", autoSatisfiedBy: ["CC7.3", "CC7.4"] },
    { code: "HIPAA-164.308.a7", title: "Contingency plan", description: "Establish data backup and disaster recovery for ePHI.", category: "Administrative", guidance: "Test backups and DR procedures quarterly.", testProcedure: "Inspect backup and DR test results.", autoSatisfiedBy: ["CC9.1", "A1.3"] },
    { code: "HIPAA-164.308.b1", title: "Business associate agreements", description: "Ensure BAAs with vendors handling PHI.", category: "Administrative", guidance: "Maintain BAA inventory for all subprocessors.", testProcedure: "Review executed BAAs.", autoSatisfiedBy: ["CC9.2", "P6.1"] },
    { code: "HIPAA-164.310.a1", title: "Facility access controls", description: "Limit physical access to systems containing ePHI.", category: "Physical", guidance: "Use cloud provider physical security attestations.", testProcedure: "Review data center SOC reports.", autoSatisfiedBy: ["CC6.4"] },
    { code: "HIPAA-164.310.d1", title: "Device and media controls", description: "Govern receipt, removal, and disposal of hardware and media.", category: "Physical", guidance: "Secure wipe devices; track media disposal.", testProcedure: "Sample disposal certificates.", autoSatisfiedBy: ["CC6.5", "C1.2"] },
    { code: "HIPAA-164.312.a1", title: "Access control", description: "Implement technical policies to allow only authorized access to ePHI.", category: "Technical", guidance: "Enforce MFA and least privilege for PHI systems.", testProcedure: "Review access control lists and MFA enrollment.", autoSatisfiedBy: ["CC6.1"] },
    { code: "HIPAA-164.312.a2", title: "Emergency access procedure", description: "Establish procedures for obtaining ePHI during an emergency.", category: "Technical", guidance: "Document break-glass access with audit logging.", testProcedure: "Review emergency access runbook.", autoSatisfiedBy: ["CC6.1"] },
    { code: "HIPAA-164.312.b", title: "Audit controls", description: "Record and examine activity in systems containing ePHI.", category: "Technical", guidance: "Centralize audit logs with retention per policy.", testProcedure: "Verify logging on PHI systems.", autoSatisfiedBy: ["CC7.1"] },
    { code: "HIPAA-164.312.c1", title: "Integrity controls", description: "Protect ePHI from improper alteration or destruction.", category: "Technical", guidance: "Use checksums and change detection on PHI stores.", testProcedure: "Review integrity monitoring configuration.", autoSatisfiedBy: ["CC8.1"] },
    { code: "HIPAA-164.312.d", title: "Person or entity authentication", description: "Verify identity of users accessing ePHI.", category: "Technical", guidance: "Require MFA for all PHI access.", testProcedure: "Test authentication on PHI applications.", autoSatisfiedBy: ["CC6.1", "CC6.2"] },
    { code: "HIPAA-164.312.e1", title: "Transmission security", description: "Guard against unauthorized access during ePHI transmission.", category: "Technical", guidance: "Enforce TLS 1.2+ for all PHI in transit.", testProcedure: "Scan endpoints for TLS configuration.", autoSatisfiedBy: ["CC6.7"] },
    { code: "HIPAA-164.312.e2", title: "Encryption", description: "Encrypt ePHI where appropriate.", category: "Technical", guidance: "Encrypt PHI at rest using AES-256 or equivalent.", testProcedure: "Verify encryption on databases and storage.", autoSatisfiedBy: ["CC6.7", "C1.1"] },
    { code: "HIPAA-164.514.b", title: "Minimum necessary", description: "Limit PHI use and disclosure to minimum necessary.", category: "Privacy", guidance: "Role-based access scoped to job function.", testProcedure: "Review role definitions and access scopes.", autoSatisfiedBy: ["C1.1", "P3.1"] },
    { code: "HIPAA-164.520", title: "Notice of privacy practices", description: "Provide notice of privacy practices to individuals.", category: "Privacy", guidance: "Publish NPP on website and at intake.", testProcedure: "Review published privacy notice.", autoSatisfiedBy: ["P1.1"] },
    { code: "HIPAA-164.524", title: "Individual access", description: "Allow individuals to access their PHI.", category: "Privacy", guidance: "Implement DSAR workflow within 30 days.", testProcedure: "Test access request process.", autoSatisfiedBy: ["P8.1"] },
    { code: "HIPAA-164.526", title: "Amendment of PHI", description: "Allow individuals to request amendment of PHI.", category: "Privacy", guidance: "Document amendment request handling.", testProcedure: "Review amendment procedures.", autoSatisfiedBy: ["P7.1"] },
    { code: "HIPAA-164.528", title: "Accounting of disclosures", description: "Provide accounting of certain PHI disclosures.", category: "Privacy", guidance: "Log disclosures not for TPO or authorized by individual.", testProcedure: "Review disclosure logging.", autoSatisfiedBy: ["P6.1"] },
  ]),

  iso27001: pack([
    { code: "ISO-A.5.1", title: "Policies for information security", description: "Define and approve information security policy.", category: "Organizational", guidance: "Publish policy approved by management.", testProcedure: "Review policy approval records.", autoSatisfiedBy: ["CC1.1"] },
    { code: "ISO-A.5.2", title: "Information security roles", description: "Define and allocate security responsibilities.", category: "Organizational", guidance: "Assign CISO or security lead.", testProcedure: "Review org chart and RACI.", autoSatisfiedBy: ["CC1.3"] },
    { code: "ISO-A.5.7", title: "Threat intelligence", description: "Collect and analyze threat information.", category: "Organizational", guidance: "Subscribe to threat feeds; review quarterly.", testProcedure: "Review threat intel sources.", autoSatisfiedBy: ["CC3.1"] },
    { code: "ISO-A.5.15", title: "Access control", description: "Establish rules to control physical and logical access.", category: "Organizational", guidance: "Document access control policy.", testProcedure: "Review access control policy.", autoSatisfiedBy: ["CC6.2"] },
    { code: "ISO-A.5.18", title: "Access rights", description: "Provision, review, and remove access rights.", category: "Organizational", guidance: "Quarterly access reviews.", testProcedure: "Sample access review records.", autoSatisfiedBy: ["CC6.3"] },
    { code: "ISO-A.5.19", title: "Supplier relationships", description: "Manage security risks with suppliers.", category: "Organizational", guidance: "Vendor risk assessments and DPAs.", testProcedure: "Review vendor assessments.", autoSatisfiedBy: ["CC9.2"] },
    { code: "ISO-A.5.24", title: "Incident management planning", description: "Plan and prepare for security incidents.", category: "Organizational", guidance: "Maintain IR plan with roles and escalation.", testProcedure: "Review IR plan.", autoSatisfiedBy: ["CC7.3"] },
    { code: "ISO-A.5.29", title: "ICT readiness for business continuity", description: "Plan ICT continuity during disruption.", category: "Organizational", guidance: "BCP/DR tested annually.", testProcedure: "Review DR test results.", autoSatisfiedBy: ["CC9.1", "A1.3"] },
    { code: "ISO-A.5.34", title: "Privacy and PII protection", description: "Protect personally identifiable information.", category: "Organizational", guidance: "Privacy policy aligned with applicable law.", testProcedure: "Review privacy policy.", autoSatisfiedBy: ["P1.1", "P3.1"] },
    { code: "ISO-A.8.5", title: "Secure authentication", description: "Implement secure authentication technologies.", category: "Technological", guidance: "MFA for all privileged and remote access.", testProcedure: "Verify MFA enforcement.", autoSatisfiedBy: ["CC6.1"] },
    { code: "ISO-A.8.7", title: "Protection against malware", description: "Implement anti-malware controls.", category: "Technological", guidance: "EDR on endpoints; scan uploads.", testProcedure: "Verify malware protection coverage.", autoSatisfiedBy: ["CC6.8"] },
    { code: "ISO-A.8.9", title: "Configuration management", description: "Manage secure configurations.", category: "Technological", guidance: "Harden baselines; IaC scanning.", testProcedure: "Review configuration standards.", autoSatisfiedBy: ["CC5.2"] },
    { code: "ISO-A.8.15", title: "Logging", description: "Record events and generate logs.", category: "Technological", guidance: "Centralize logs with tamper protection.", testProcedure: "Verify log collection.", autoSatisfiedBy: ["CC7.1"] },
    { code: "ISO-A.8.16", title: "Monitoring activities", description: "Monitor networks and systems for anomalies.", category: "Technological", guidance: "SIEM alerting on critical events.", testProcedure: "Review monitoring dashboards.", autoSatisfiedBy: ["CC7.2"] },
    { code: "ISO-A.8.20", title: "Networks security", description: "Secure networks and network services.", category: "Technological", guidance: "Segment networks; restrict ingress.", testProcedure: "Review firewall and security groups.", autoSatisfiedBy: ["CC6.6"] },
    { code: "ISO-A.8.24", title: "Use of cryptography", description: "Define and implement cryptographic controls.", category: "Technological", guidance: "TLS 1.2+; encrypt sensitive data at rest.", testProcedure: "Verify crypto configuration.", autoSatisfiedBy: ["CC6.7"] },
    { code: "ISO-A.8.32", title: "Change management", description: "Control changes to information processing facilities.", category: "Technological", guidance: "PR reviews and CI gates before deploy.", testProcedure: "Sample change tickets.", autoSatisfiedBy: ["CC8.1"] },
    { code: "ISO-A.7.1", title: "Physical security perimeters", description: "Define and use security perimeters.", category: "Physical", guidance: "Rely on cloud provider physical controls.", testProcedure: "Review provider attestations.", autoSatisfiedBy: ["CC6.4"] },
    { code: "ISO-A.7.10", title: "Storage media", description: "Manage storage media through lifecycle.", category: "Physical", guidance: "Encrypt and securely dispose media.", testProcedure: "Review media handling procedures.", autoSatisfiedBy: ["CC6.5"] },
    { code: "ISO-A.6.1", title: "Screening", description: "Background verification for candidates.", category: "People", guidance: "Background checks for sensitive roles.", testProcedure: "Review screening policy.", autoSatisfiedBy: ["CC1.4"] },
  ]),

  iso42001: pack([
    { code: "ISO42001-A.5.1", title: "AI policies", description: "Establish AI management system policies.", category: "AI Governance", guidance: "Document AI use policy approved by leadership.", testProcedure: "Review AI policy.", autoSatisfiedBy: ["CC1.1"] },
    { code: "ISO42001-A.6.1", title: "AI risk assessment", description: "Assess risks of AI systems.", category: "AI Governance", guidance: "AI impact assessments for high-risk use cases.", testProcedure: "Review AI risk register.", autoSatisfiedBy: ["CC3.1"] },
    { code: "ISO42001-A.6.2", title: "AI impact assessment", description: "Evaluate societal and individual impacts of AI.", category: "AI Governance", guidance: "Document bias and fairness reviews.", testProcedure: "Sample AI impact assessments.", autoSatisfiedBy: ["CC3.3"] },
    { code: "ISO42001-A.8.1", title: "AI operational controls", description: "Control AI system operations.", category: "AI Operations", guidance: "Version models; monitor drift.", testProcedure: "Review model registry.", autoSatisfiedBy: ["CC5.1"] },
    { code: "ISO42001-A.8.3", title: "AI lifecycle management", description: "Manage AI through development, deployment, and retirement.", category: "AI Operations", guidance: "Document model lifecycle stages.", testProcedure: "Review lifecycle documentation.", autoSatisfiedBy: ["CC8.1"] },
    { code: "ISO42001-A.9.1", title: "AI access control", description: "Restrict access to AI systems and training data.", category: "AI Security", guidance: "RBAC for model endpoints and datasets.", testProcedure: "Review AI system access controls.", autoSatisfiedBy: ["CC6.1"] },
    { code: "ISO42001-A.9.2", title: "AI data protection", description: "Protect training and inference data.", category: "AI Security", guidance: "Anonymize PII in training sets.", testProcedure: "Review data handling for AI.", autoSatisfiedBy: ["CC6.7", "C1.1"] },
    { code: "ISO42001-A.10.1", title: "AI logging and traceability", description: "Log AI decisions for auditability.", category: "AI Security", guidance: "Log prompts, outputs, and model versions.", testProcedure: "Verify AI audit logs.", autoSatisfiedBy: ["CC7.1"] },
    { code: "ISO42001-A.10.2", title: "AI performance monitoring", description: "Monitor AI system performance and accuracy.", category: "AI Operations", guidance: "Track accuracy, latency, and error rates.", testProcedure: "Review AI monitoring dashboards.", autoSatisfiedBy: ["CC7.2"] },
    { code: "ISO42001-A.11.1", title: "AI incident handling", description: "Respond to AI-related incidents.", category: "AI Operations", guidance: "Include AI failures in IR plan.", testProcedure: "Review AI incident procedures.", autoSatisfiedBy: ["CC7.3"] },
    { code: "ISO42001-A.12.1", title: "Third-party AI vendors", description: "Manage risks from external AI providers.", category: "AI Governance", guidance: "Review AI vendor contracts and data use.", testProcedure: "Review AI vendor assessments.", autoSatisfiedBy: ["CC9.2"] },
    { code: "ISO42001-A.13.1", title: "AI transparency", description: "Disclose AI use to affected individuals.", category: "AI Ethics", guidance: "Notify users when interacting with AI.", testProcedure: "Review disclosure mechanisms.", autoSatisfiedBy: ["P1.1"] },
    { code: "ISO42001-A.13.2", title: "Personal data in AI", description: "Limit personal data in AI processing.", category: "AI Ethics", guidance: "Data minimization for ML pipelines.", testProcedure: "Review training data sources.", autoSatisfiedBy: ["P3.1"] },
  ]),

  gdpr: pack([
    { code: "GDPR-Art5", title: "Principles of processing", description: "Process personal data lawfully, fairly, and transparently.", category: "Principles", guidance: "Document lawful basis for each processing activity.", testProcedure: "Review processing register.", autoSatisfiedBy: ["P4.1"] },
    { code: "GDPR-Art6", title: "Lawfulness of processing", description: "Establish lawful basis before processing.", category: "Principles", guidance: "Map activities to consent, contract, or legitimate interest.", testProcedure: "Review lawful basis documentation.", autoSatisfiedBy: ["P2.1"] },
    { code: "GDPR-Art7", title: "Conditions for consent", description: "Obtain valid consent where required.", category: "Consent", guidance: "Granular opt-in; easy withdrawal.", testProcedure: "Test consent flows.", autoSatisfiedBy: ["P2.1"] },
    { code: "GDPR-Art13", title: "Information to be provided", description: "Provide privacy information when collecting data.", category: "Transparency", guidance: "Privacy notice at collection points.", testProcedure: "Review privacy notices.", autoSatisfiedBy: ["P1.1"] },
    { code: "GDPR-Art15", title: "Right of access", description: "Enable data subjects to access their data.", category: "Rights", guidance: "DSAR portal with 30-day SLA.", testProcedure: "Test access request workflow.", autoSatisfiedBy: ["P8.1"] },
    { code: "GDPR-Art17", title: "Right to erasure", description: "Delete personal data upon request.", category: "Rights", guidance: "Automated deletion workflows.", testProcedure: "Test erasure process.", autoSatisfiedBy: ["C1.2", "P5.1"] },
    { code: "GDPR-Art25", title: "Data protection by design", description: "Implement privacy by design and default.", category: "Design", guidance: "Privacy review in SDLC.", testProcedure: "Review design docs for privacy.", autoSatisfiedBy: ["CC5.1"] },
    { code: "GDPR-Art28", title: "Processor agreements", description: "Use DPAs with all processors.", category: "Vendors", guidance: "Maintain processor list with DPAs.", testProcedure: "Review DPAs.", autoSatisfiedBy: ["P6.1", "CC9.2"] },
    { code: "GDPR-Art30", title: "Records of processing", description: "Maintain records of processing activities.", category: "Accountability", guidance: "Document all processing in ROPA.", testProcedure: "Review ROPA.", autoSatisfiedBy: ["CC2.1"] },
    { code: "GDPR-Art32", title: "Security of processing", description: "Implement appropriate technical and organizational measures.", category: "Security", guidance: "Encryption, access control, resilience.", testProcedure: "Review security measures.", autoSatisfiedBy: ["CC6.1", "CC6.7"] },
    { code: "GDPR-Art33", title: "Breach notification to authority", description: "Notify supervisory authority within 72 hours.", category: "Incidents", guidance: "Breach notification runbook.", testProcedure: "Review breach procedures.", autoSatisfiedBy: ["CC7.3"] },
    { code: "GDPR-Art34", title: "Breach communication to subjects", description: "Notify data subjects of high-risk breaches.", category: "Incidents", guidance: "Template communications for breaches.", testProcedure: "Review breach communication plan.", autoSatisfiedBy: ["CC7.4"] },
    { code: "GDPR-Art35", title: "Data protection impact assessment", description: "Conduct DPIAs for high-risk processing.", category: "Accountability", guidance: "DPIA for new high-risk features.", testProcedure: "Review completed DPIAs.", autoSatisfiedBy: ["CC3.2"] },
  ]),

  "pci-dss": pack([
    { code: "PCI-1.1", title: "Network security controls", description: "Install and maintain network security controls.", category: "Network", guidance: "Firewalls and WAF on cardholder environments.", testProcedure: "Review network diagrams and firewall rules.", autoSatisfiedBy: ["CC6.6"] },
    { code: "PCI-2.2", title: "Secure configurations", description: "Apply secure configurations to system components.", category: "Configuration", guidance: "CIS benchmarks; remove defaults.", testProcedure: "Review configuration standards.", autoSatisfiedBy: ["CC5.2"] },
    { code: "PCI-3.4", title: "Protect stored account data", description: "Render PAN unreadable anywhere stored.", category: "Data Protection", guidance: "Tokenize or encrypt PAN; never store CVV.", testProcedure: "Verify PAN storage controls.", autoSatisfiedBy: ["CC6.7", "C1.1"] },
    { code: "PCI-4.2", title: "Strong cryptography for transmission", description: "Encrypt PAN during transmission over open networks.", category: "Encryption", guidance: "TLS 1.2+ for all payment flows.", testProcedure: "Scan payment endpoints.", autoSatisfiedBy: ["CC6.7"] },
    { code: "PCI-5.2", title: "Malware protection", description: "Protect systems against malware.", category: "Malware", guidance: "Anti-malware on in-scope systems.", testProcedure: "Verify malware protection.", autoSatisfiedBy: ["CC6.8"] },
    { code: "PCI-6.4", title: "Change control", description: "Manage changes to in-scope systems.", category: "Change", guidance: "Formal change approval for CDE.", testProcedure: "Sample change records.", autoSatisfiedBy: ["CC8.1"] },
    { code: "PCI-7.2", title: "Access control systems", description: "Restrict access to system components by business need.", category: "Access", guidance: "RBAC with least privilege in CDE.", testProcedure: "Review access control matrix.", autoSatisfiedBy: ["CC6.1"] },
    { code: "PCI-8.2", title: "User authentication", description: "Identify and authenticate users.", category: "Access", guidance: "MFA for all CDE access.", testProcedure: "Verify MFA on CDE.", autoSatisfiedBy: ["CC6.2"] },
    { code: "PCI-8.3", title: "Multi-factor authentication", description: "Require MFA for CDE access.", category: "Access", guidance: "MFA enforced via IdP.", testProcedure: "Test MFA enforcement.", autoSatisfiedBy: ["CC6.1"] },
    { code: "PCI-10.2", title: "Audit logs", description: "Log access to system components and cardholder data.", category: "Logging", guidance: "Centralize CDE audit logs.", testProcedure: "Verify log coverage.", autoSatisfiedBy: ["CC7.1"] },
    { code: "PCI-10.6", title: "Log review", description: "Review logs daily.", category: "Logging", guidance: "Automated log review and alerting.", testProcedure: "Review log review procedures.", autoSatisfiedBy: ["CC7.2"] },
    { code: "PCI-11.3", title: "Vulnerability scanning", description: "Perform internal and external vulnerability scans.", category: "Testing", guidance: "Quarterly ASV scans.", testProcedure: "Review scan reports.", autoSatisfiedBy: ["CC4.1", "CC3.2"] },
    { code: "PCI-12.10", title: "Incident response plan", description: "Implement incident response plan.", category: "Incidents", guidance: "IR plan tested annually.", testProcedure: "Review IR plan and tests.", autoSatisfiedBy: ["CC7.4"] },
  ]),

  fedramp: pack([
    { code: "AC-2", title: "Account management", description: "Manage system accounts including lifecycle.", category: "Access Control", guidance: "Automated provisioning/deprovisioning.", testProcedure: "Review account management procedures.", autoSatisfiedBy: ["CC6.1", "CC6.3"] },
    { code: "AC-3", title: "Access enforcement", description: "Enforce approved authorizations.", category: "Access Control", guidance: "RBAC with deny-by-default.", testProcedure: "Test access enforcement.", autoSatisfiedBy: ["CC6.2"] },
    { code: "AC-7", title: "Unsuccessful logon attempts", description: "Limit consecutive failed logins.", category: "Access Control", guidance: "Lockout after failed attempts.", testProcedure: "Verify lockout policy.", autoSatisfiedBy: ["CC6.1"] },
    { code: "AU-2", title: "Audit events", description: "Identify auditable events.", category: "Audit", guidance: "Define auditable event list.", testProcedure: "Review audit policy.", autoSatisfiedBy: ["CC7.1"] },
    { code: "AU-6", title: "Audit review and analysis", description: "Review and analyze audit records.", category: "Audit", guidance: "Daily automated log review.", testProcedure: "Review log analysis procedures.", autoSatisfiedBy: ["CC7.2"] },
    { code: "CA-7", title: "Continuous monitoring", description: "Monitor security controls continuously.", category: "Assessment", guidance: "Continuous compliance scanning.", testProcedure: "Review monitoring strategy.", autoSatisfiedBy: ["CC4.1"] },
    { code: "CM-2", title: "Baseline configuration", description: "Develop and maintain baseline configurations.", category: "Config Mgmt", guidance: "IaC baselines with drift detection.", testProcedure: "Review baselines.", autoSatisfiedBy: ["CC5.2"] },
    { code: "CM-3", title: "Configuration change control", description: "Control changes to system.", category: "Config Mgmt", guidance: "Change advisory board for production.", testProcedure: "Sample change records.", autoSatisfiedBy: ["CC8.1"] },
    { code: "CP-2", title: "Contingency plan", description: "Develop contingency plan.", category: "Contingency", guidance: "BCP/DR with RTO/RPO.", testProcedure: "Review contingency plan.", autoSatisfiedBy: ["CC9.1"] },
    { code: "CP-9", title: "System backup", description: "Perform system backups.", category: "Contingency", guidance: "Encrypted backups with tested restore.", testProcedure: "Test backup restore.", autoSatisfiedBy: ["A1.3"] },
    { code: "IA-2", title: "Identification and authentication", description: "Uniquely identify and authenticate users.", category: "Identification", guidance: "MFA for privileged and network access.", testProcedure: "Verify MFA.", autoSatisfiedBy: ["CC6.1"] },
    { code: "IR-4", title: "Incident handling", description: "Implement incident handling capability.", category: "Incident Response", guidance: "FedRAMP incident reporting procedures.", testProcedure: "Review IR capability.", autoSatisfiedBy: ["CC7.3"] },
    { code: "IR-5", title: "Incident monitoring", description: "Track and document incidents.", category: "Incident Response", guidance: "Incident tracking system.", testProcedure: "Review incident records.", autoSatisfiedBy: ["CC7.4"] },
    { code: "RA-3", title: "Risk assessment", description: "Conduct risk assessments.", category: "Risk", guidance: "Annual risk assessment.", testProcedure: "Review risk assessment.", autoSatisfiedBy: ["CC3.1"] },
    { code: "RA-5", title: "Vulnerability scanning", description: "Scan for vulnerabilities.", category: "Risk", guidance: "Monthly authenticated scans.", testProcedure: "Review scan results.", autoSatisfiedBy: ["CC3.2"] },
    { code: "SA-9", title: "External system services", description: "Manage external service providers.", category: "Acquisition", guidance: "FedRAMP authorized cloud services.", testProcedure: "Review provider authorizations.", autoSatisfiedBy: ["CC9.2"] },
    { code: "SC-7", title: "Boundary protection", description: "Monitor and control communications at boundaries.", category: "System Protection", guidance: "Network segmentation and firewalls.", testProcedure: "Review boundary controls.", autoSatisfiedBy: ["CC6.6"] },
    { code: "SC-13", title: "Cryptographic protection", description: "Implement FIPS-validated cryptography.", category: "System Protection", guidance: "FIPS 140-2 modules where required.", testProcedure: "Review crypto modules.", autoSatisfiedBy: ["CC6.7"] },
    { code: "SI-3", title: "Malicious code protection", description: "Detect and eradicate malicious code.", category: "System Integrity", guidance: "Real-time malware protection.", testProcedure: "Verify anti-malware.", autoSatisfiedBy: ["CC6.8"] },
  ]),

  cmmc: pack([
    { code: "AC.L2-3.1.1", title: "Authorized access control", description: "Limit system access to authorized users.", category: "Access Control", guidance: "Document authorized users and devices.", testProcedure: "Review access authorization records.", autoSatisfiedBy: ["CC6.1"] },
    { code: "AC.L2-3.1.2", title: "Transaction and function control", description: "Limit users to authorized functions.", category: "Access Control", guidance: "Role-based function restrictions.", testProcedure: "Test function-level access.", autoSatisfiedBy: ["CC6.2"] },
    { code: "AC.L2-3.1.3", title: "Control CUI flow", description: "Control flow of CUI per approved authorizations.", category: "Access Control", guidance: "Label and track CUI data flows.", testProcedure: "Review CUI flow documentation.", autoSatisfiedBy: ["C1.1"] },
    { code: "AC.L2-3.1.6", title: "Least privilege", description: "Employ least privilege including for specific duties.", category: "Access Control", guidance: "Minimal permissions per role.", testProcedure: "Review privilege assignments.", autoSatisfiedBy: ["CC6.3"] },
    { code: "AU.L2-3.3.1", title: "System auditing", description: "Create and retain audit records.", category: "Audit", guidance: "Audit CUI access and changes.", testProcedure: "Verify audit logging.", autoSatisfiedBy: ["CC7.1"] },
    { code: "AU.L2-3.3.2", title: "Audit record review", description: "Review and update logged events.", category: "Audit", guidance: "Regular audit log review.", testProcedure: "Review audit review records.", autoSatisfiedBy: ["CC7.2"] },
    { code: "CM.L2-3.4.1", title: "System baselines", description: "Establish and maintain baseline configurations.", category: "Config Mgmt", guidance: "Document secure baselines.", testProcedure: "Review baseline documentation.", autoSatisfiedBy: ["CC5.2"] },
    { code: "CM.L2-3.4.2", title: "Security configuration settings", description: "Establish and enforce security settings.", category: "Config Mgmt", guidance: "Hardening standards applied.", testProcedure: "Verify configuration compliance.", autoSatisfiedBy: ["CC8.1"] },
    { code: "IA.L2-3.5.2", title: "Authenticate users", description: "Authenticate identities before access.", category: "Identification", guidance: "MFA for CUI systems.", testProcedure: "Test authentication.", autoSatisfiedBy: ["CC6.1"] },
    { code: "IR.L2-3.6.1", title: "Incident handling", description: "Establish operational incident-handling capability.", category: "Incident Response", guidance: "IR plan for CUI incidents.", testProcedure: "Review IR plan.", autoSatisfiedBy: ["CC7.3"] },
    { code: "IR.L2-3.6.2", title: "Incident reporting", description: "Track and report incidents.", category: "Incident Response", guidance: "Report to DIBCAC as required.", testProcedure: "Review incident reports.", autoSatisfiedBy: ["CC7.4"] },
    { code: "RM.L2-3.11.2", title: "Vulnerability scan", description: "Scan for vulnerabilities.", category: "Risk Management", guidance: "Regular vulnerability scanning.", testProcedure: "Review scan reports.", autoSatisfiedBy: ["CC3.2"] },
    { code: "RM.L2-3.11.3", title: "Remediate vulnerabilities", description: "Remediate vulnerabilities per risk.", category: "Risk Management", guidance: "Track remediation SLAs.", testProcedure: "Review remediation tickets.", autoSatisfiedBy: ["CC4.2"] },
    { code: "SC.L2-3.13.1", title: "Boundary protection", description: "Monitor and control communications at boundaries.", category: "System Protection", guidance: "Network segmentation for CUI.", testProcedure: "Review network architecture.", autoSatisfiedBy: ["CC6.6"] },
    { code: "SC.L2-3.13.11", title: "Cryptographic protection", description: "Employ FIPS-validated cryptography.", category: "System Protection", guidance: "Encrypt CUI at rest and in transit.", testProcedure: "Verify encryption.", autoSatisfiedBy: ["CC6.7"] },
    { code: "SI.L2-3.14.2", title: "Malicious code protection", description: "Implement malicious code protection.", category: "System Integrity", guidance: "Anti-malware on CUI systems.", testProcedure: "Verify malware protection.", autoSatisfiedBy: ["CC6.8"] },
    { code: "AT.L2-3.2.1", title: "Role-based security training", description: "Ensure personnel are trained.", category: "Awareness", guidance: "CMMC security awareness training.", testProcedure: "Review training records.", autoSatisfiedBy: ["CC1.4"] },
    { code: "PS.L2-3.9.1", title: "Screen personnel", description: "Screen individuals prior to access.", category: "Personnel", guidance: "Background checks for CUI access.", testProcedure: "Review screening records.", autoSatisfiedBy: ["CC1.5"] },
  ]),

  soc1: pack([
    { code: "SOC1-IC1", title: "Control environment integrity", description: "Demonstrate commitment to integrity in financial reporting controls.", category: "Control Environment", guidance: "Code of conduct for finance team.", testProcedure: "Review ethics policy.", autoSatisfiedBy: ["CC1.1"] },
    { code: "SOC1-IC2", title: "Board oversight", description: "Board exercises oversight of financial reporting.", category: "Control Environment", guidance: "Audit committee charter.", testProcedure: "Review board minutes.", autoSatisfiedBy: ["CC1.2"] },
    { code: "SOC1-RA1", title: "Financial risk assessment", description: "Identify risks to financial reporting.", category: "Risk Assessment", guidance: "Annual financial risk assessment.", testProcedure: "Review risk register.", autoSatisfiedBy: ["CC3.1"] },
    { code: "SOC1-CA1", title: "Control activities", description: "Select and develop control activities.", category: "Control Activities", guidance: "Map controls to financial risks.", testProcedure: "Review control matrix.", autoSatisfiedBy: ["CC5.1"] },
    { code: "SOC1-PI1", title: "Processing completeness", description: "Ensure complete processing of transactions.", category: "Processing Integrity", guidance: "Reconciliation controls.", testProcedure: "Sample reconciliations.", autoSatisfiedBy: ["PI1.1"] },
    { code: "SOC1-PI2", title: "Processing accuracy", description: "Ensure accurate processing.", category: "Processing Integrity", guidance: "Validation and error handling.", testProcedure: "Review error logs.", autoSatisfiedBy: ["PI1.2"] },
    { code: "SOC1-CM1", title: "Change management", description: "Control changes affecting financial systems.", category: "Change Management", guidance: "Change approval for financial apps.", testProcedure: "Sample change tickets.", autoSatisfiedBy: ["CC8.1"] },
    { code: "SOC1-MO1", title: "Monitoring controls", description: "Monitor internal controls over financial reporting.", category: "Monitoring", guidance: "Continuous control monitoring.", testProcedure: "Review monitoring reports.", autoSatisfiedBy: ["CC4.1"] },
    { code: "SOC1-VM1", title: "Vendor management", description: "Manage vendor risks affecting ICFR.", category: "Vendor Management", guidance: "SOC 1 reports from critical vendors.", testProcedure: "Review vendor SOC reports.", autoSatisfiedBy: ["CC9.2"] },
  ]),

  soc3: pack([
    { code: "SOC3-CC1", title: "Control environment (public)", description: "Public trust report — control environment.", category: "Trust Services", guidance: "Same as SOC 2 CC1 criteria.", testProcedure: "Review SOC 2 CC1 evidence.", autoSatisfiedBy: ["CC1.1"] },
    { code: "SOC3-CC6", title: "Logical access (public)", description: "Public trust report — logical access.", category: "Trust Services", guidance: "Same as SOC 2 CC6 criteria.", testProcedure: "Review SOC 2 CC6 evidence.", autoSatisfiedBy: ["CC6.1"] },
    { code: "SOC3-CC7", title: "System operations (public)", description: "Public trust report — system operations.", category: "Trust Services", guidance: "Same as SOC 2 CC7 criteria.", testProcedure: "Review SOC 2 CC7 evidence.", autoSatisfiedBy: ["CC7.1"] },
    { code: "SOC3-A1", title: "Availability (public)", description: "Public trust report — availability.", category: "Trust Services", guidance: "Same as SOC 2 A1 criteria.", testProcedure: "Review availability controls.", autoSatisfiedBy: ["A1.1"] },
    { code: "SOC3-P1", title: "Privacy (public)", description: "Public trust report — privacy.", category: "Trust Services", guidance: "Same as SOC 2 P criteria.", testProcedure: "Review privacy controls.", autoSatisfiedBy: ["P1.1"] },
  ]),
};

export const NATIVE_CONTROL_FRAMEWORK_SLUGS = Object.keys(NATIVE_CONTROL_PACKS);

export function nativeControlCount(slug: string): number {
  return NATIVE_CONTROL_PACKS[slug]?.length ?? 0;
}
