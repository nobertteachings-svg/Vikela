/**
 * Built-in security awareness curriculum.
 * Modules are synced into each org; learners take lessons + quiz before completion.
 */

export type CourseLesson = {
  id: string;
  title: string;
  minutes: number;
  body: string;
};

export type CourseQuizQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  /** 0-based index of the correct choice */
  correctIndex: number;
};

export type CatalogCourse = {
  key: string;
  name: string;
  description: string;
  framework: string;
  durationMin: number;
  /** Days from sync date until due (null = no due date) */
  dueInDays: number | null;
  lessons: CourseLesson[];
  quiz: CourseQuizQuestion[];
  acknowledgment: string;
};

export const COURSE_CATALOG: CatalogCourse[] = [
  {
    key: "security-awareness-basics",
    name: "Security Awareness Basics",
    description:
      "Phishing, passwords, device hygiene, and how to report incidents — required annual training for all staff.",
    framework: "SOC 2 CC1.4",
    durationMin: 30,
    dueInDays: 30,
    acknowledgment:
      "I confirm I have completed Security Awareness Basics and will follow company security policies.",
    lessons: [
      {
        id: "sa-1",
        title: "Why security awareness matters",
        minutes: 4,
        body: `Most breaches start with a person, not a firewall.

Attackers target busy employees with emails, texts, and fake login pages. One click or reused password can expose customer data and delay audits.

Your role:
• Treat unexpected requests for money, data, or credentials as suspicious
• Report anything odd — early reporting reduces impact
• Never assume “IT already knows”`,
      },
      {
        id: "sa-2",
        title: "Passwords and MFA",
        minutes: 6,
        body: `Strong authentication is non-negotiable.

Do:
• Use a password manager and unique passwords per service
• Enable MFA (authenticator app preferred over SMS)
• Lock your screen when you step away

Don't:
• Share passwords in Slack/email
• Reuse personal passwords at work
• Disable MFA “temporarily”`,
      },
      {
        id: "sa-3",
        title: "Phishing and social engineering",
        minutes: 8,
        body: `Phishing emails often look urgent: “Payroll update”, “CEO needs a gift card”, “Your account will be locked”.

Red flags:
• Unexpected attachments or links
• Slightly wrong domains (rnicrosoft.com)
• Pressure to skip normal approval
• Requests for secrets, MFA codes, or wire transfers

If unsure: hover links, verify via a second channel, and report to security.`,
      },
      {
        id: "sa-4",
        title: "Devices, data, and reporting",
        minutes: 6,
        body: `Keep company data on approved tools only.

• Encrypt laptops and keep OS/apps updated
• Don't store customer data on personal drives or USB sticks
• Use VPN on untrusted networks
• Report lost/stolen devices immediately

Incident reporting: email security@ or use the in-app report path. Include what happened, when, and any screenshots (no passwords).`,
      },
    ],
    quiz: [
      {
        id: "sa-q1",
        prompt: "What is the safest way to handle an urgent wire-transfer request from “the CEO” via email?",
        choices: [
          "Send the payment immediately to avoid delays",
          "Reply asking for bank details in the same email thread",
          "Verify through a known second channel before acting",
          "Forward it to the whole company",
        ],
        correctIndex: 2,
      },
      {
        id: "sa-q2",
        prompt: "Which practice best protects account access?",
        choices: [
          "One strong password reused everywhere",
          "Unique passwords plus MFA",
          "Writing passwords on a sticky note under the keyboard",
          "Sharing a team login in Slack",
        ],
        correctIndex: 1,
      },
      {
        id: "sa-q3",
        prompt: "You clicked a suspicious link. What should you do first?",
        choices: [
          "Ignore it if nothing obvious happened",
          "Delete the email and continue working",
          "Report it immediately to security/IT",
          "Forward the link to friends to check",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    key: "acceptable-use-policy",
    name: "Acceptable Use Policy Acknowledgment",
    description:
      "Read and acknowledge the company acceptable use policy for systems, data, and communications.",
    framework: "SOC 2 CC1.4",
    durationMin: 15,
    dueInDays: 14,
    acknowledgment:
      "I have read the Acceptable Use Policy and agree to follow it while using company systems and data.",
    lessons: [
      {
        id: "aup-1",
        title: "Scope of acceptable use",
        minutes: 5,
        body: `Company systems (email, laptops, cloud apps, Slack) are provided for business purposes.

Limited personal use may be allowed if it does not:
• Interfere with work
• Violate law or policy
• Expose the company to risk

Monitoring: activity on company systems may be logged for security and compliance.`,
      },
      {
        id: "aup-2",
        title: "Prohibited activities",
        minutes: 5,
        body: `You must not:
• Access systems or data you are not authorized for
• Install unapproved software or browser extensions that handle secrets
• Host illegal or harassing content
• Bypass security controls (MFA, DLP, endpoint protection)
• Use company resources for cryptocurrency mining or side businesses without approval`,
      },
      {
        id: "aup-3",
        title: "Data handling expectations",
        minutes: 4,
        body: `Classify and handle data appropriately.

• Customer and employee personal data → least privilege, approved tools only
• Secrets and API keys → password manager / secrets vault, never git or chat
• When leaving the company → return devices and revoke access promptly`,
      },
    ],
    quiz: [
      {
        id: "aup-q1",
        prompt: "Is it acceptable to share your VPN login with a contractor so they can “just finish something”?",
        choices: [
          "Yes, if they seem trustworthy",
          "Yes, for less than 24 hours",
          "No — credentials must not be shared",
          "Only if you CC your manager",
        ],
        correctIndex: 2,
      },
      {
        id: "aup-q2",
        prompt: "Where should API keys be stored?",
        choices: [
          "In a public GitHub gist for easy access",
          "In Slack pinned messages",
          "In an approved secrets manager / password vault",
          "In a spreadsheet on your Desktop",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    key: "phishing-deep-dive",
    name: "Phishing & Social Engineering Deep Dive",
    description:
      "Identify modern phishing, smishing, and callback scams; practice safe verification habits.",
    framework: "SOC 2 CC1.4",
    durationMin: 25,
    dueInDays: 45,
    acknowledgment:
      "I understand common social-engineering tactics and will verify unusual requests before acting.",
    lessons: [
      {
        id: "ph-1",
        title: "Types of phishing",
        minutes: 7,
        body: `Common forms:
• Email phishing — bulk or targeted (spear phishing)
• Smishing — SMS with malicious links
• Vishing — phone calls impersonating IT or banks
• Callback phishing — fake “support” numbers on malware popups

Business Email Compromise (BEC) often has no malware — just a convincing invoice or payroll change.`,
      },
      {
        id: "ph-2",
        title: "How to verify safely",
        minutes: 8,
        body: `Verification checklist:
1. Check the real domain (not display name)
2. Don't use contact details from the suspicious message
3. Use a known-good channel (directory, prior email, ticket system)
4. For money/data changes — require dual approval

Never read MFA codes aloud to callers claiming to be IT.`,
      },
      {
        id: "ph-3",
        title: "Reporting and containment",
        minutes: 5,
        body: `Report phishing even if you did not click.
If you did interact:
• Disconnect from the network if instructed
• Reset passwords from a clean device
• Preserve the email/headers for investigation

Do not permanently delete evidence until security confirms.`,
      },
    ],
    quiz: [
      {
        id: "ph-q1",
        prompt: "A caller says they are IT and need your MFA code to “unlock your account.” You should:",
        choices: [
          "Provide the code so you can keep working",
          "Refuse and report the call — IT will never ask for MFA codes",
          "Give the code but change your password later",
          "Ask them to email you instead and then send the code",
        ],
        correctIndex: 1,
      },
      {
        id: "ph-q2",
        prompt: "Which is a hallmark of many BEC attacks?",
        choices: [
          "A ransomware lock screen",
          "An urgent payment or vendor-bank-detail change with little malware",
          "A USB stick left in the parking lot",
          "A Wi-Fi pineapple in the lobby",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    key: "data-privacy-gdpr",
    name: "Data Privacy Essentials (GDPR/CCPA)",
    description:
      "How to handle personal data, minimize collection, and respond to privacy requests.",
    framework: "SOC 2 P1.1 / Privacy",
    durationMin: 35,
    dueInDays: 60,
    acknowledgment:
      "I will handle personal data according to company privacy policy and applicable regulations.",
    lessons: [
      {
        id: "dp-1",
        title: "What counts as personal data",
        minutes: 8,
        body: `Personal data is any information relating to an identifiable person: names, emails, IPs, device IDs, support tickets, billing details, and more.

Special / sensitive categories need extra care (health, biometrics, government IDs).

If you are unsure whether something is personal data — treat it as personal data.`,
      },
      {
        id: "dp-2",
        title: "Lawful use and minimization",
        minutes: 8,
        body: `Collect only what you need for a clear purpose.
• Don't copy production personal data into personal notebooks or unsanctioned AI tools
• Prefer aggregated or synthetic data for demos
• Follow retention schedules — delete when no longer needed`,
      },
      {
        id: "dp-3",
        title: "Requests and incidents",
        minutes: 7,
        body: `Privacy rights may include access, deletion, and correction.
• Route formal requests to the privacy/legal owner — don't improvise
• If personal data is exposed, escalate immediately as a security/privacy incident
• Document what happened without spreading sensitive details further`,
      },
    ],
    quiz: [
      {
        id: "dp-q1",
        prompt: "You want to demo a feature using real customer emails. Best practice?",
        choices: [
          "Use production data — it's more realistic",
          "Use anonymized/synthetic data or a sanctioned staging set",
          "Export the CRM to your personal Gmail",
          "Post a screenshot in a public Discord",
        ],
        correctIndex: 1,
      },
      {
        id: "dp-q2",
        prompt: "A user emails asking to delete their account data. You should:",
        choices: [
          "Delete whatever you can find in your laptop folder",
          "Ignore it unless they are a paying customer",
          "Route it through the official privacy request process",
          "Ask them to tweet at the company",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    key: "hipaa-workforce",
    name: "HIPAA Workforce Awareness",
    description:
      "For teams that may touch ePHI: minimum necessary, unauthorized disclosure, and breach awareness.",
    framework: "HIPAA §164.308",
    durationMin: 40,
    dueInDays: 60,
    acknowledgment:
      "I understand HIPAA workforce responsibilities and will protect ePHI using minimum necessary access.",
    lessons: [
      {
        id: "hipaa-1",
        title: "What is ePHI?",
        minutes: 8,
        body: `Electronic Protected Health Information (ePHI) is health information that can identify a person and is created, received, or maintained electronically.

Even small identifiers combined with health context can be ePHI. When in doubt, escalate before sharing.`,
      },
      {
        id: "hipaa-2",
        title: "Minimum necessary & access",
        minutes: 10,
        body: `Access ePHI only when your job requires it, and only the minimum needed.
• Don't browse records out of curiosity
• Don't discuss patient/customer health details in public channels
• Log out of shared workstations
• Report suspected snooping or misdirected emails containing health data`,
      },
      {
        id: "hipaa-3",
        title: "Breaches and vendors",
        minutes: 8,
        body: `A breach can be as simple as emailing ePHI to the wrong person.
• Notify security/privacy immediately — do not wait
• Vendors handling ePHI need appropriate agreements (e.g. BAA) — don't onboard tools yourself
• Keep ePHI out of unsanctioned SaaS and personal devices`,
      },
    ],
    quiz: [
      {
        id: "hipaa-q1",
        prompt: "Looking up a friend's health record “just to help them” is:",
        choices: [
          "Fine if you don't change anything",
          "Allowed for employees with system access",
          "A violation — access must be job-required and minimum necessary",
          "OK if you tell your manager afterward",
        ],
        correctIndex: 2,
      },
      {
        id: "hipaa-q2",
        prompt: "You accidentally email ePHI to the wrong external address. First step?",
        choices: [
          "Hope they ignore it",
          "Report it immediately through incident/privacy channels",
          "Send another email asking them to delete it and do nothing else",
          "Post in #general asking what to do",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    key: "secure-engineering",
    name: "Secure Engineering Essentials",
    description:
      "For builders: secrets handling, dependency risk, PR hygiene, and production access discipline.",
    framework: "SOC 2 CC8.1 / CC6.1",
    durationMin: 35,
    dueInDays: 45,
    acknowledgment:
      "I will follow secure development practices including secrets hygiene, reviews, and least-privilege production access.",
    lessons: [
      {
        id: "se-1",
        title: "Secrets and repositories",
        minutes: 8,
        body: `Never commit secrets. If you do:
1. Rotate the secret immediately
2. Remove it from history if required by security
3. Report the exposure

Use environment variables, secret managers, and pre-commit scanners. Treat .env files as confidential.`,
      },
      {
        id: "se-2",
        title: "Code review and dependencies",
        minutes: 8,
        body: `• Require review on production-bound changes
• Don't approve PRs you didn't understand
• Keep dependencies updated; investigate high CVEs
• Avoid copy-pasting unknown code from the internet into privileged paths`,
      },
      {
        id: "se-3",
        title: "Production access",
        minutes: 7,
        body: `Production is not a playground.
• Prefer break-glass / time-bound access
• Log why you accessed customer data
• Never disable logging or security controls to “ship faster” without approval
• Use staging with synthetic data whenever possible`,
      },
    ],
    quiz: [
      {
        id: "se-q1",
        prompt: "You accidentally pushed an AWS key to GitHub. What first?",
        choices: [
          "Delete the file in a new commit and move on",
          "Rotate/revoke the key immediately, then follow incident process",
          "Rename the variable so scanners miss it",
          "Wait to see if anyone finds it",
        ],
        correctIndex: 1,
      },
      {
        id: "se-q2",
        prompt: "Best practice for production data when debugging?",
        choices: [
          "Copy a full production dump to your laptop",
          "Use staging/synthetic data; if prod access is required, use approved least-privilege paths",
          "Disable audit logs so you can work faster",
          "Share DB credentials in the PR description",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    key: "incident-response-basics",
    name: "Incident Response Basics",
    description:
      "Recognize incidents, escalate correctly, preserve evidence, and communicate without speculation.",
    framework: "SOC 2 CC7.3 / CC7.4",
    durationMin: 25,
    dueInDays: 45,
    acknowledgment:
      "I know how to recognize and escalate security incidents without destroying evidence or spreading panic.",
    lessons: [
      {
        id: "ir-1",
        title: "What is an incident?",
        minutes: 6,
        body: `Examples:
• Confirmed or suspected unauthorized access
• Malware on a company device
• Lost laptop with company data
• Accidental public exposure of a private repo or customer export
• Ransomware / extortion attempts

When unsure, escalate — security would rather triage a false alarm.`,
      },
      {
        id: "ir-2",
        title: "First response actions",
        minutes: 8,
        body: `Do:
• Capture what you observed (time, systems, screenshots)
• Isolate only if instructed or if clearly safe (e.g. disconnect compromised machine)
• Contact the on-call / security channel

Don't:
• Wipe devices before forensics guidance
• Negotiate with attackers
• Post speculative details publicly or to customers`,
      },
      {
        id: "ir-3",
        title: "Communication",
        minutes: 5,
        body: `Stick to facts. Legal/security own external messaging.
Internal updates should avoid blame and focus on containment.
Afterward, participate honestly in the postmortem — blameless culture improves defenses.`,
      },
    ],
    quiz: [
      {
        id: "ir-q1",
        prompt: "You find ransomware notes on a shared drive. Best immediate action?",
        choices: [
          "Delete the notes and restore from your personal backup quietly",
          "Pay if a wallet address is provided",
          "Escalate to security/incident response immediately and preserve evidence",
          "Announce it on Twitter for transparency",
        ],
        correctIndex: 2,
      },
      {
        id: "ir-q2",
        prompt: "Why preserve evidence?",
        choices: [
          "It looks good in screenshots",
          "It helps determine scope, root cause, and required notifications",
          "Auditors require every Slack message forever",
          "So you can blame a coworker",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    key: "remote-work-security",
    name: "Secure Remote Work",
    description:
      "Home and travel security: Wi-Fi, physical privacy, screen locking, and approved collaboration tools.",
    framework: "SOC 2 CC6.1",
    durationMin: 20,
    dueInDays: 30,
    acknowledgment:
      "I will follow remote-work security requirements including VPN, screen lock, and approved tools.",
    lessons: [
      {
        id: "rw-1",
        title: "Network and physical safety",
        minutes: 6,
        body: `• Prefer trusted networks + company VPN
• Avoid sensitive work on public computers
• Use privacy screens in public
• Don't leave devices unattended in cars or cafés`,
      },
      {
        id: "rw-2",
        title: "Collaboration hygiene",
        minutes: 6,
        body: `• Stick to approved chat/video/file tools
• Be careful screen-sharing — hide passwords and customer lists
• Verify meeting links from calendars, not unexpected DMs
• Shred or secure printed materials at home`,
      },
      {
        id: "rw-3",
        title: "Travel checklist",
        minutes: 5,
        body: `Before travel: update OS, confirm disk encryption, know how to remote-wipe.
During travel: use VPN, disable auto-join Wi-Fi, keep devices in carry-on.
If a device is lost: report immediately for wipe/revocation.`,
      },
    ],
    quiz: [
      {
        id: "rw-q1",
        prompt: "Working from a coffee shop on customer data, you should:",
        choices: [
          "Join open Wi-Fi with no VPN — it's faster",
          "Use VPN, lock your screen, and avoid shoulder surfing",
          "Print everything so you don't need the network",
          "Give your laptop password to the barista if asked",
        ],
        correctIndex: 1,
      },
      {
        id: "rw-q2",
        prompt: "Your laptop is stolen from a train. First priority?",
        choices: [
          "Buy a replacement before telling anyone",
          "Report immediately so access can be revoked / device wiped",
          "Wait 48 hours in case it turns up",
          "Post the serial number only on social media",
        ],
        correctIndex: 1,
      },
    ],
  },
];

export function getCatalogCourse(key: string): CatalogCourse | undefined {
  return COURSE_CATALOG.find((c) => c.key === key);
}

export function gradeQuiz(
  course: CatalogCourse,
  answers: Record<string, number>
): { passed: boolean; score: number; total: number; missIds: string[] } {
  const total = course.quiz.length;
  let score = 0;
  const missIds: string[] = [];
  for (const q of course.quiz) {
    if (answers[q.id] === q.correctIndex) score += 1;
    else missIds.push(q.id);
  }
  // Require all correct for short quizzes; allow one miss if 3+ questions.
  const passed = total <= 2 ? score === total : score >= total - 1;
  return { passed, score, total, missIds };
}
