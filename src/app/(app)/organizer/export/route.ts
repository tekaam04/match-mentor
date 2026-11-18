import { getCurrentUser } from "@/lib/dal";
import { AnalyticsError } from "@/lib/analytics-client";
import { hasRole, needsOnboarding } from "@/lib/roles";
import { exportPilotCsv } from "@/server/analytics";

/** GET /organizer/export → pilot metrics CSV, built by the Python analytics service. Organizers only. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  if (needsOnboarding(user) || !hasRole(user.role, ["organizer"])) {
    return new Response("Only organizers can export pilot data.", { status: 403 });
  }

  try {
    const csv = await exportPilotCsv(user);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="s2s-pilot-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AnalyticsError) {
      console.error(`[analytics] export failed: ${err.message}`);
      return new Response("The export service isn't available right now. Try again in a minute.", { status: 503 });
    }
    throw err;
  }
}
