import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { testOutbox } from "@/lib/email";
import { resetDatabase } from "../support/db";

const BASE = "http://localhost:3000";

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

/** Requests a magic link, follows it, and returns the resulting session cookie. */
async function signInWithMagicLink(email: string) {
  const res = await post("/sign-in/magic-link", { email, callbackURL: "/dashboard" });
  expect(res.status).toBe(200);

  const sent = testOutbox.at(-1);
  expect(sent?.to).toBe(email);
  const link = sent!.text.match(/https?:\/\/\S+/)![0];

  const verify = await auth.handler(new Request(link));
  expect(verify.status).toBe(302);
  const cookie = verify.headers.getSetCookie().find((c) => c.includes("session_token"));
  expect(cookie).toBeDefined();
  return cookie!.split(";")[0];
}

beforeEach(async () => {
  await resetDatabase();
  testOutbox.length = 0;
});

describe("magic link sign-in", () => {
  it("creates a new user with the student role by default", async () => {
    const cookie = await signInWithMagicLink("new.student@test.local");

    const user = await db.user.findUniqueOrThrow({ where: { email: "new.student@test.local" } });
    expect(user.role).toBe("student");
    expect(user.emailVerified).toBe(true);

    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.email).toBe("new.student@test.local");
    expect(session?.user.role).toBe("student");
  });

  it("makes SEED_ADMIN_EMAILS addresses admins on first sign-in", async () => {
    await signInWithMagicLink("Admin@Test.local");

    const user = await db.user.findUniqueOrThrow({ where: { email: "admin@test.local" } });
    expect(user.role).toBe("admin");
  });

  it("keeps the role of an existing user", async () => {
    await db.user.create({ data: { id: "m1", email: "mentor@test.local", name: "Mentor", role: "mentor" } });

    const cookie = await signInWithMagicLink("mentor@test.local");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.role).toBe("mentor");
  });

  it("rejects an invalid token", async () => {
    const res = await auth.handler(new Request(`${BASE}/api/auth/magic-link/verify?token=bogus&callbackURL=/dashboard`));
    expect(res.headers.getSetCookie().some((c) => c.includes("session_token="))).toBe(false);
    expect(await db.session.count()).toBe(0);
  });
});

describe("role field", () => {
  it("cannot be set by the client when updating the user", async () => {
    const cookie = await signInWithMagicLink("sneaky@test.local");

    const res = await post("/update-user", { role: "admin" }, { cookie });
    expect(res.status).toBeGreaterThanOrEqual(400);

    const user = await db.user.findUniqueOrThrow({ where: { email: "sneaky@test.local" } });
    expect(user.role).toBe("student");
  });
});
