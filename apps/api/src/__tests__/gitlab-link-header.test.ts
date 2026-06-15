import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractNextUrl } from "../services/git/gitlab/link-header.js";

describe("extractNextUrl", () => {
  it("returns next URL from a single Link relation", () => {
    const link =
      '<https://gitlab.com/api/v4/projects/1/repository/tree?page_token=abc&pagination=keyset&per_page=100>; rel="next"';
    assert.equal(
      extractNextUrl(link),
      "https://gitlab.com/api/v4/projects/1/repository/tree?page_token=abc&pagination=keyset&per_page=100"
    );
  });

  it("parses multiple relations and picks rel=next", () => {
    const link =
      '<https://gitlab.com/api/v4/projects/1/repository/tree?page_token=first&pagination=keyset>; rel="first", ' +
      '<https://gitlab.com/api/v4/projects/1/repository/tree?page_token=next&pagination=keyset>; rel="next"';
    assert.equal(
      extractNextUrl(link),
      "https://gitlab.com/api/v4/projects/1/repository/tree?page_token=next&pagination=keyset"
    );
  });

  it("returns null when no next relation exists", () => {
    assert.equal(extractNextUrl(null), null);
    assert.equal(
      extractNextUrl('<https://gitlab.com/api/v4/projects/1/repository/tree>; rel="first"'),
      null
    );
  });
});
