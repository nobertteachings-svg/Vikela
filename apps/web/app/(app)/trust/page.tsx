import { complianceApi } from "@/lib/compliance-api";
import { ApiError } from "@/components/comply/api-error";

export default async function TrustCenterPage() {
  let org;
  let frameworks;
  let policies;
  try {
    [org, frameworks, policies] = await Promise.all([
      complianceApi.org(),
      complianceApi.frameworks(),
      complianceApi.policies(),
    ]);
  } catch (e) {
    return (
      <div className="trust-light min-h-[calc(100vh-4rem)] bg-[#FAF9F5] p-8">
        <ApiError message={e instanceof Error ? e.message : "Failed to load trust center"} />
      </div>
    );
  }

  const activeFrameworks = frameworks.filter((f) => f.enrolled);
  const publishedPolicies = policies.filter((p) => p.status === "PUBLISHED" || p.status === "APPROVED");

  return (
    <div className="trust-light -mx-4 -mt-6 min-h-[calc(100vh-4rem)] bg-[#FAF9F5] text-[#2C2C2A] sm:-mx-6 lg:-mx-8">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-12 lg:py-16">
        <span className="inline-flex items-center rounded-lg bg-[#EEEDFE] px-3 py-1.5 text-sm font-semibold text-[#534AB7] shadow-sm">
          {org.name}
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance">
          Our Security & Compliance
        </h1>
        <p className="mt-2 text-[#888780]">
          trust.vikela.co/{org.slug} · Last updated {new Date().toLocaleDateString()}
        </p>

        <div className="mt-10 flex flex-wrap gap-2.5">
          {activeFrameworks.length === 0 ? (
            <span className="text-sm text-[#888780]">Framework certifications in progress</span>
          ) : (
            activeFrameworks.map((f) => (
              <span
                key={f.id}
                className="rounded-full border border-[#AFA9EC] bg-[#EEEDFE] px-4 py-1.5 text-sm font-medium text-[#534AB7]"
              >
                {f.name}
                {f.score > 0 ? ` · ${f.score}%` : ""}
              </span>
            ))
          )}
        </div>

        <section className="mt-14">
          <h2 className="text-lg font-semibold">Published policies</h2>
          <ul className="mt-4 space-y-3">
            {publishedPolicies.length === 0 ? (
              <li className="text-sm text-[#888780]">Policies in progress</li>
            ) : (
              publishedPolicies.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-[#D3D1C7]/60 bg-white px-4 py-3 text-sm text-[#534AB7] shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
                  {p.title}
                </li>
              ))
            )}
          </ul>
        </section>

        <div className="mt-14 rounded-xl border border-[#D3D1C7] bg-white p-6 shadow-[0_8px_30px_rgba(44,44,42,0.06)]">
          <h2 className="font-semibold">Request our SOC 2 report</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#888780]">
            Enter your work email and we&apos;ll send the report within 2 business days.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="you@prospect.com"
              className="flex-1 rounded-lg border border-[#D3D1C7] px-3 py-2.5 text-sm transition-colors focus:border-[#534AB7] focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20"
            />
            <button
              type="button"
              className="rounded-lg bg-[#534AB7] px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(83,74,183,0.25)] transition-opacity hover:opacity-90"
            >
              Request report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
