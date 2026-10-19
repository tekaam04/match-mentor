import { describe, expect, it } from "vitest";
import { parseEmailList } from "./admin-emails";

describe("parseEmailList", () => {
  it("returns nothing for empty input", () => {
    expect(parseEmailList(undefined)).toEqual([]);
    expect(parseEmailList("")).toEqual([]);
  });

  it("splits on commas, semicolons and whitespace", () => {
    expect(parseEmailList("a@x.com, b@x.com;c@x.com\nd@x.com")).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com"]);
  });

  it("lowercases, trims and de-duplicates", () => {
    expect(parseEmailList(" A@X.com , a@x.com ")).toEqual(["a@x.com"]);
  });

  it("drops entries that are not emails", () => {
    expect(parseEmailList("a@x.com,,not-an-email")).toEqual(["a@x.com"]);
  });
});
