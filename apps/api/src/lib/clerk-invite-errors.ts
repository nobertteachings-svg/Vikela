import { isClerkAPIResponseError } from "@clerk/shared/error";

export function clerkInviteHttpError(err: unknown): { status: number; message: string } | null {
  if (!isClerkAPIResponseError(err)) return null;

  const invalidRole = err.errors?.some(
    (e) =>
      e.code === "form_param_value_invalid" &&
      (e.meta?.param_name === "role" || e.meta?.paramName === "role")
  );
  if (invalidRole) {
    return {
      status: 422,
      message:
        "Auditor role not configured in Clerk for this environment. Check ops checklist.",
    };
  }

  const anyInvalid = err.errors?.some((e) => e.code === "form_param_value_invalid");
  if (anyInvalid) {
    return {
      status: 422,
      message:
        "Organization role not configured in Clerk for this environment. Check ops checklist.",
    };
  }

  return null;
}
