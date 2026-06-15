"use client";

import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconCircleCheck,
  IconCreditCard,
  IconReceipt,
} from "@tabler/icons-react";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import { billingPlans, type BillingPlanId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { BillingStripeActions } from "./billing-stripe-actions";

export type BillingSubscriptionProp = {
  orgName: string;
  plan: string;
  planLabel: string;
  status: string;
  seats: { used: number; limit: number; included?: number };
  stripeConfigured?: boolean;
  renewalDate?: string | null;
  nextInvoiceDate?: string | null;
  renewalAmountCents?: number | null;
  billingEmail?: string | null;
  paymentMethod?: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  usage?: {
    integrations: { used: number; limit: number };
    scans: { used: number; limit: number };
    evidence: { used: number; limit: number | null };
    storageMb: { used: number; limit: number };
    openGaps: number;
  };
  invoices?: Array<{
    id: string;
    date: string;
    amount: string;
    status: string;
    pdfUrl: string | null;
  }>;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

function usagePercent(used: number, limit: number | null): number {
  if (limit == null || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function statusBadgeClass(status: string): string {
  if (status === "past_due" || status === "unpaid") {
    return "border-comply-red/40 bg-comply-red/15 text-comply-red";
  }
  if (status === "trialing") {
    return "border-comply-purple-border/40 bg-comply-purple/15 text-comply-purple-border";
  }
  if (status === "active") {
    return "border-comply-green/40 bg-comply-green/15 text-comply-green";
  }
  if (status === "free") {
    return "border-white/[0.12] bg-white/[0.04] text-comply-text-secondary";
  }
  return "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text";
}

function UsageMeter({
  label,
  used,
  limit,
  unit,
  description,
  approximate,
}: {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
  description: string;
  approximate?: boolean;
}) {
  const pct = usagePercent(used, limit);
  const suffix =
    limit == null ? `${used} ${unit} · unlimited` : `${used} / ${limit} ${unit}`;

  return (
    <div className="marketing-panel relative p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-comply-text-primary">
            {label}
            {approximate ? (
              <span className="ml-1.5 text-[10px] font-normal normal-case text-comply-text-tertiary">
                (approx.)
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-comply-text-secondary">{description}</p>
        </div>
        <span className="shrink-0 font-mono text-xs text-comply-purple-border">{suffix}</span>
      </div>
      {limit != null && (
        <div className="comply-progress-track mt-4">
          <div
            className={cn(
              "comply-progress-bar",
              pct >= 90 && "from-comply-amber to-comply-amber-text"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function BillingPageContent({
  subscription,
}: {
  subscription: BillingSubscriptionProp;
}) {
  const planId = subscription.plan.toLowerCase() as BillingPlanId;
  const seatLimit = subscription.seats.limit ?? subscription.seats.included ?? 3;
  const usage = subscription.usage;
  const invoices = subscription.invoices ?? [];
  const paymentMethod = subscription.paymentMethod;
  const status = subscription.status;
  const isPaymentIssue = status === "past_due" || status === "unpaid";
  const renewalDate = subscription.renewalDate ?? subscription.nextInvoiceDate;
  const renewalLabel = renewalDate
    ? new Date(renewalDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const renewalAmount =
    subscription.renewalAmountCents != null
      ? `$${(subscription.renewalAmountCents / 100).toFixed(2)}`
      : null;
  const billingEmail = subscription.billingEmail ?? null;
  const currentPlan = billingPlans.find((p) => p.id === planId) ?? billingPlans[0]!;

  const usageMeters = usage
    ? [
        {
          label: "Integrations",
          used: usage.integrations.used,
          limit: usage.integrations.limit,
          unit: "connected",
          description: "Active Git, cloud, and identity providers",
        },
        {
          label: "Scans this month",
          used: usage.scans.used,
          limit: usage.scans.limit,
          unit: "scans",
          description: "Code, cloud, and full compliance scans",
        },
        {
          label: "Evidence items",
          used: usage.evidence.used,
          limit: usage.evidence.limit,
          unit: "items",
          description: "Uploaded and auto-collected audit evidence",
        },
        {
          label: "Storage",
          used: usage.storageMb.used,
          limit: usage.storageMb.limit,
          unit: "MB",
          description: "Evidence file storage for your org",
          approximate: true,
        },
      ]
    : [];

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Admin"
        title="Billing"
        description={`Manage your plan, usage, payment method, and invoices for ${subscription.orgName}.`}
      >
        <BillingStripeActions
          stripeConfigured={subscription.stripeConfigured ?? false}
          currentPlan={subscription.plan}
        />
      </PageHeader>

      {isPaymentIssue ? (
        <div className="flex items-start gap-3 rounded-lg border border-comply-red/40 bg-comply-red/10 px-4 py-3">
          <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-comply-red" />
          <div>
            <p className="text-sm font-medium text-comply-red">Payment required</p>
            <p className="mt-1 text-sm text-comply-text-secondary">
              Your subscription is <strong>{formatStatusLabel(status)}</strong>. Update your
              payment method in the billing portal to avoid service interruption.
            </p>
          </div>
        </div>
      ) : null}

      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-comply-purple/25 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <SectionLabel>Current plan</SectionLabel>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-medium tracking-tight text-comply-text-primary sm:text-3xl">
                {subscription.planLabel}
              </h2>
              <span
                className={cn(
                  "rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  statusBadgeClass(status)
                )}
              >
                {formatStatusLabel(status)}
              </span>
            </div>
            {renewalAmount ? (
              <p className="mt-2 font-mono text-lg text-comply-purple-border">
                {renewalAmount}
                <span className="text-sm font-sans font-normal text-comply-text-tertiary">
                  /billing period
                </span>
              </p>
            ) : null}
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-comply-text-secondary">
              {currentPlan.description}
              {renewalLabel ? (
                <>
                  {" "}
                  Renews{" "}
                  <strong className="text-comply-text-primary">{renewalLabel}</strong>
                </>
              ) : null}
              {billingEmail ? (
                <>
                  {" "}
                  · billed to <span className="font-mono text-xs">{billingEmail}</span>
                </>
              ) : null}
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {currentPlan.features.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-2 text-sm text-comply-text-secondary">
                  <IconCircleCheck size={16} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {renewalAmount && renewalLabel ? (
            <div className="rounded-md border border-white/[0.08] bg-black/25 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                Next invoice
              </p>
              <p className="mt-1 font-mono text-xl text-comply-text-primary">{renewalAmount}</p>
              <p className="text-xs text-comply-muted">{renewalLabel}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <SectionLabel>This billing cycle</SectionLabel>
        {usage ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
              <StatCard
                label="Team seats"
                value={`${subscription.seats.used}/${seatLimit}`}
                accent="purple"
              />
              <StatCard
                label="Integrations"
                value={`${usage.integrations.used}/${usage.integrations.limit}`}
                accent="green"
              />
              <StatCard
                label="Scans this month"
                value={`${usage.scans.used}/${usage.scans.limit}`}
                accent="amber"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {usageMeters.map((u) => (
                <UsageMeter
                  key={u.label}
                  label={u.label}
                  used={u.used}
                  limit={u.limit}
                  unit={u.unit}
                  description={u.description}
                  approximate={"approximate" in u && u.approximate}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div>
        <div>
          <SectionLabel>Plans</SectionLabel>
          <h2 className="mt-2 text-lg font-medium tracking-tight text-comply-text-primary">
            Compare plans
          </h2>
          <p className="mt-1 text-sm text-comply-text-secondary">
            Feature comparison by tier.{" "}
            {subscription.stripeConfigured
              ? "Use the upgrade buttons at the top of this page to change plans."
              : "Contact sales for paid plans in this environment."}
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {billingPlans.map((plan) => {
            const isCurrent = plan.id === planId;
            const showPrice = subscription.stripeConfigured && plan.price != null;
            const priceLabel = !showPrice
              ? isCurrent
                ? "Current"
                : plan.id === "enterprise"
                  ? "Custom"
                  : "—"
              : plan.price === 0
                ? "$0"
                : `$${plan.price}`;

            return (
              <div
                key={plan.id}
                className={cn(
                  "marketing-panel relative flex flex-col p-5 text-left",
                  plan.highlight && "marketing-panel-highlight",
                  isCurrent && "border-comply-purple-border/40"
                )}
              >
                {isCurrent && (
                  <span className="absolute right-4 top-4 rounded-sm border border-comply-purple-border/50 bg-comply-purple/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-comply-purple-border">
                    Current
                  </span>
                )}
                <p className="text-sm font-medium text-comply-text-secondary">{plan.name}</p>
                <p className="mt-2 font-mono text-2xl tracking-tight text-comply-text-primary">
                  {priceLabel}
                  {showPrice && plan.price != null && plan.price > 0 && (
                    <span className="text-sm font-sans font-normal text-comply-text-tertiary">
                      {plan.period}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-comply-muted">{plan.description}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-xs text-comply-text-secondary">
                      <IconCircleCheck size={14} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.id === "enterprise" ? (
                  <a
                    href="mailto:hello@vikela.com"
                    className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-medium text-comply-text-primary transition-colors hover:border-comply-purple-border"
                  >
                    Contact sales
                  </a>
                ) : isCurrent ? (
                  <p className="mt-5 text-center text-xs text-comply-text-tertiary">Your current plan</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card elevated>
          <CardHeader title="Payment method" />
          <CardBody className="space-y-4">
            <div className="marketing-panel flex items-center gap-4 p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-md border border-white/[0.1] bg-black/30">
                <IconCreditCard size={24} className="text-comply-purple-border" stroke={1.5} />
              </span>
              <div>
                {paymentMethod ? (
                  <>
                    <p className="font-medium text-comply-text-primary">
                      {paymentMethod.brand} ···· {paymentMethod.last4}
                    </p>
                    <p className="text-sm text-comply-text-secondary">
                      Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-comply-text-secondary">
                    {subscription.stripeConfigured
                      ? "No card on file — use Manage subscription above to add one."
                      : "Stripe not configured in this environment."}
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {billingEmail ? (
          <Card elevated>
            <CardHeader title="Billing contact" />
            <CardBody className="space-y-4">
              <label className="block text-sm">
                <span className="text-comply-text-secondary">Invoice email</span>
                <input
                  value={billingEmail}
                  type="email"
                  readOnly
                  className="comply-input mt-1.5"
                />
              </label>
              <p className="text-xs text-comply-text-tertiary">
                From your Stripe customer record. Update via the billing portal.
              </p>
            </CardBody>
          </Card>
        ) : null}
      </div>

      <Card elevated>
        <CardHeader
          title="Invoice history"
          action={
            <a
              href="mailto:hello@vikela.com"
              className="flex items-center gap-1 text-xs font-medium text-comply-purple-border hover:underline"
            >
              Billing support
              <IconArrowUpRight size={14} />
            </a>
          }
        />
        <CardBody className="p-0 pb-1">
          {invoices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-comply-text-secondary">
              {subscription.stripeConfigured
                ? "No invoices yet. Invoices appear here after your first paid subscription charge."
                : "Invoice history is available when Stripe billing is configured."}
            </p>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs text-comply-text-secondary">{inv.id}</td>
                    <td className="text-comply-text-secondary">
                      {new Date(inv.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>{subscription.planLabel} subscription</td>
                    <td className="font-mono text-sm">{inv.amount}</td>
                    <td>
                      <span className="comply-badge border-comply-green/30 bg-comply-green/10 text-comply-green normal-case">
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-comply-purple-border hover:underline"
                        >
                          <IconReceipt size={14} />
                          PDF
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <div className="marketing-panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <SectionLabel>Need help?</SectionLabel>
          <p className="mt-2 text-sm text-comply-text-secondary">
            Questions about proration, annual contracts, or enterprise procurement—we respond within
            one business day.
          </p>
        </div>
        <a href="mailto:hello@vikela.com" className="btn-purple-cta inline-flex h-9 items-center px-4 text-sm">
          Contact sales
        </a>
      </div>
    </div>
  );
}
