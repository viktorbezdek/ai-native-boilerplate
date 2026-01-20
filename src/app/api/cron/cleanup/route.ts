import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { lt } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
	// Verify cron secret to prevent unauthorized access
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const results = {
			expiredSessions: 0,
			timestamp: new Date().toISOString(),
		};

		// Clean up expired sessions (older than 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const deletedSessions = await db
			.delete(sessions)
			.where(lt(sessions.expiresAt, thirtyDaysAgo))
			.returning({ id: sessions.id });

		results.expiredSessions = deletedSessions.length;

		console.log(`[Cron] Cleanup completed: ${JSON.stringify(results)}`);

		return NextResponse.json({
			success: true,
			message: "Cleanup completed",
			results,
		});
	} catch (error) {
		console.error("[Cron] Cleanup failed:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Cleanup failed",
			},
			{ status: 500 },
		);
	}
}
