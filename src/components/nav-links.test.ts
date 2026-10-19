import { describe, expect, it } from "vitest";
import { activeHref } from "./nav-links";

const items = [
  { href: "/student", label: "My requests" },
  { href: "/student/requests/new", label: "New request" },
  { href: "/student/profile", label: "Profile" },
];

describe("activeHref", () => {
  it("picks the most specific matching item", () => {
    expect(activeHref(items, "/student")).toBe("/student");
    expect(activeHref(items, "/student/requests/new")).toBe("/student/requests/new");
    expect(activeHref(items, "/student/requests/abc")).toBe("/student");
    expect(activeHref(items, "/student/profile")).toBe("/student/profile");
  });

  it("does not match on a shared prefix that isn't a path segment", () => {
    expect(activeHref(items, "/students")).toBeUndefined();
  });
});
