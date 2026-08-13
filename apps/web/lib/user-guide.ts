import fs from "fs";
import path from "path";

const CONTENT_ROOT = path.join(process.cwd(), "content", "user-guide");

export type HelpNavItem = {
  href: string;
  title: string;
  children?: HelpNavItem[];
};

const TOP_LEVEL: Array<{ file: string; title: string }> = [
  { file: "getting-started.md", title: "Getting started" },
  { file: "frameworks.md", title: "Frameworks" },
  { file: "controls.md", title: "Controls" },
  { file: "gaps-and-findings.md", title: "Gaps and findings" },
  { file: "evidence.md", title: "Evidence" },
  { file: "policies.md", title: "Policies" },
  { file: "copilot.md", title: "Copilot" },
  { file: "risks.md", title: "Risks" },
  { file: "vendors.md", title: "Vendors" },
  { file: "team-and-access.md", title: "Team and access" },
  { file: "training.md", title: "Training" },
  { file: "settings.md", title: "Settings" },
  { file: "billing.md", title: "Billing" },
];

const INTEGRATION_PAGES: Array<{ file: string; title: string }> = [
  { file: "integrations/README.md", title: "Integrations overview" },
  { file: "integrations/github.md", title: "GitHub" },
  { file: "integrations/gitlab.md", title: "GitLab" },
  { file: "integrations/bitbucket.md", title: "Bitbucket" },
  { file: "integrations/aws.md", title: "AWS" },
  { file: "integrations/azure.md", title: "Azure" },
  { file: "integrations/gcp.md", title: "Google Cloud" },
  { file: "integrations/cloudflare.md", title: "Cloudflare" },
  { file: "integrations/okta.md", title: "Okta" },
  { file: "integrations/azure-ad.md", title: "Azure AD" },
  { file: "integrations/google-workspace.md", title: "Google Workspace" },
  { file: "integrations/auth0.md", title: "Auth0" },
  { file: "integrations/jumpcloud.md", title: "JumpCloud" },
  { file: "integrations/datadog.md", title: "Datadog" },
  { file: "integrations/grafana.md", title: "Grafana" },
  { file: "integrations/pagerduty.md", title: "PagerDuty" },
  { file: "integrations/new-relic.md", title: "New Relic" },
  { file: "integrations/slack.md", title: "Slack" },
  { file: "integrations/microsoft-teams.md", title: "Microsoft Teams" },
];

function slugFromFile(file: string): string {
  if (file === "README.md") return "";
  if (file === "integrations/README.md") return "integrations";
  return file.replace(/\.md$/, "").replace(/\\/g, "/");
}

export function helpNav(): HelpNavItem[] {
  return [
    { href: "/help", title: "Overview" },
    ...TOP_LEVEL.map((p) => ({
      href: `/help/${slugFromFile(p.file)}`,
      title: p.title,
    })),
    {
      href: "/help/integrations",
      title: "Integrations",
      children: INTEGRATION_PAGES.filter((p) => p.file !== "integrations/README.md").map((p) => ({
        href: `/help/${slugFromFile(p.file)}`,
        title: p.title,
      })),
    },
  ];
}

function resolveGuidePath(slugParts: string[]): string | null {
  if (slugParts.length === 0) {
    return path.join(CONTENT_ROOT, "README.md");
  }
  const joined = slugParts.join("/");
  if (joined === "integrations") {
    return path.join(CONTENT_ROOT, "integrations", "README.md");
  }
  const candidate = path.join(CONTENT_ROOT, `${joined}.md`);
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

/** Very small Markdown, HTML for help pages (headings, lists, tables, code, links). */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let inUl = false;
  let inTable = false;

  const flushUl = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  };
  const flushTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };

  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
        const safeHref = href.startsWith("http") || href.startsWith("/") || href.startsWith("./") || href.startsWith("../")
          ? rewriteHelpHref(href)
          : "#";
        return `<a href="${safeHref}">${label}</a>`;
      });

  for (const raw of lines) {
    const line = raw;
    if (line.startsWith("```")) {
      flushUl();
      flushTable();
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        out.push('<pre class="help-pre"><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      out.push(`${escapeHtml(line)}\n`);
      continue;
    }
    if (line.startsWith("|") && line.includes("|")) {
      flushUl();
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }
      if (!inTable) {
        out.push('<table class="help-table"><tbody>');
        inTable = true;
        out.push(`<tr>${cells.map((c) => `<th>${inline(c)}</th>`).join("")}</tr>`);
      } else {
        out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
      }
      continue;
    }
    flushTable();

    if (/^[-*] /.test(line)) {
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    flushUl();

    if (line.startsWith("# ")) {
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("> ")) {
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      out.push("");
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
  }
  flushUl();
  flushTable();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

function rewriteHelpHref(href: string): string {
  if (href.startsWith("http") || href.startsWith("/help") || href.startsWith("/dashboard")) {
    return href;
  }
  if (href.startsWith("./")) {
    return `/help/${href.slice(2).replace(/\.md$/, "").replace(/\/README$/, "").replace(/README$/, "integrations")}`;
  }
  if (href.startsWith("../")) {
    const rest = href.replace(/^\.\.\//, "").replace(/\.md$/, "");
    if (rest === "README" || rest === "") return "/help";
    return `/help/${rest}`;
  }
  if (href.endsWith(".md")) {
    return `/help/${href.replace(/\.md$/, "").replace(/\/README$/, "").replace(/^README$/, "")}`;
  }
  return href;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function loadHelpPage(slugParts: string[]): { title: string; html: string } | null {
  const filePath = resolveGuidePath(slugParts);
  if (!filePath || !fs.existsSync(filePath)) return null;
  const md = fs.readFileSync(filePath, "utf8");
  // Strip YAML front matter if present
  const body = md.replace(/^---[\s\S]*?---\n/, "");
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? "Help";
  return { title, html: markdownToHtml(body) };
}
