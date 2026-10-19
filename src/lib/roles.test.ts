import { describe, expect, it } from "vitest";
import { hasRole, homeFor, isRole, ROLES } from "./roles";

describe("hasRole", () => {
  it("allows a role listed explicitly", () => {
    expect(hasRole("student", ["student"])).toBe(true);
    expect(hasRole("mentor", ["student", "mentor"])).toBe(true);
  });

  it("denies a role that is not listed", () => {
    expect(hasRole("student", ["mentor"])).toBe(false);
    expect(hasRole("mentor", ["organizer"])).toBe(false);
    expect(hasRole("organizer", ["admin"])).toBe(false);
  });

  it("lets admins act as organizers", () => {
    expect(hasRole("admin", ["organizer"])).toBe(true);
  });

  it("does not let admins act as students or mentors", () => {
    expect(hasRole("admin", ["student"])).toBe(false);
    expect(hasRole("admin", ["mentor"])).toBe(false);
  });
});

describe("homeFor", () => {
  it("sends each role to its own area", () => {
    expect(homeFor("student")).toBe("/student");
    expect(homeFor("mentor")).toBe("/mentor");
    expect(homeFor("organizer")).toBe("/organizer");
    expect(homeFor("admin")).toBe("/organizer");
  });

  it("has a home for every role", () => {
    for (const role of ROLES) expect(homeFor(role)).toMatch(/^\//);
  });
});

describe("isRole", () => {
  it("accepts known roles only", () => {
    expect(isRole("mentor")).toBe(true);
    expect(isRole("superuser")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
