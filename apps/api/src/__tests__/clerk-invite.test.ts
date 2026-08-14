import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPendingInviteActive,
  mapClerkRole,
  parseInviteRole,
  resolveMemberRoleFromInvite,
  toClerkRole,
} from "../lib/clerk-roles.js";
import { clerkInviteHttpError } from "../lib/clerk-invite-errors.js";

describe("clerk roles", () => {
  it("maps org:auditor to AUDITOR", () => {
    assert.equal(mapClerkRole("org:auditor"), "AUDITOR");
  });

  it("maps invite role strings", () => {
    assert.equal(parseInviteRole("auditor"), "AUDITOR");
    assert.equal(parseInviteRole("MEMBER"), "MEMBER");
  });

  it("maps Shieldoq roles to Clerk keys", () => {
    assert.equal(toClerkRole("AUDITOR"), "org:auditor");
    assert.equal(toClerkRole("MEMBER"), "org:member");
  });
});

describe("resolveMemberRoleFromInvite", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it("trusts Clerk auditor role over pending invite", () => {
    assert.equal(
      resolveMemberRoleFromInvite("org:auditor", {
        role: "MEMBER",
        acceptedAt: null,
        expiresAt: future,
      }),
      "AUDITOR"
    );
  });

  it("applies active pending invite when Clerk role is generic", () => {
    assert.equal(
      resolveMemberRoleFromInvite("org:member", {
        role: "AUDITOR",
        acceptedAt: null,
        expiresAt: future,
      }),
      "AUDITOR"
    );
  });

  it("ignores expired pending invite and falls back to MEMBER", () => {
    assert.equal(
      resolveMemberRoleFromInvite("org:member", {
        role: "AUDITOR",
        acceptedAt: null,
        expiresAt: past,
      }),
      "MEMBER"
    );
  });

  it("ignores accepted pending invite", () => {
    assert.equal(
      resolveMemberRoleFromInvite("org:member", {
        role: "AUDITOR",
        acceptedAt: new Date(),
        expiresAt: future,
      }),
      "MEMBER"
    );
  });
});

describe("isPendingInviteActive", () => {
  it("returns false for expired invites", () => {
    assert.equal(
      isPendingInviteActive({
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
      }),
      false
    );
  });
});

import { ClerkAPIResponseError } from "@clerk/shared/error";
import { clerkInviteHttpError } from "../lib/clerk-invite-errors.js";

describe("clerkInviteHttpError", () => {
  it("maps invalid role to 422 ops message", () => {
    const err = new ClerkAPIResponseError("Unprocessable", {
      status: 422,
      clerkTraceId: "trace",
      data: [{ code: "form_param_value_invalid", meta: { param_name: "role" } }],
    });
    const mapped = clerkInviteHttpError(err);
    assert.equal(mapped?.status, 422);
    assert.match(mapped?.message ?? "", /ops checklist/i);
  });
});
