import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";

export const dynamic = "force-dynamic";

const CYCLE_DURATION_DAYS = 14;
const ALERT_THRESHOLD_DAYS = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const activeCycles = await prisma.vrCycle.findMany({
    where: {
      endDate: null,
      holding: { userId },
    },
    include: {
      holding: {
        select: {
          id: true,
          name: true,
          ticker: true,
        },
      },
    },
    orderBy: {
      startDate: "asc",
    },
  });

  const alerts = activeCycles
    .map((cycle) => {
      const estimatedEndDate = addDays(cycle.startDate, CYCLE_DURATION_DAYS);
      const totalMs = estimatedEndDate.getTime() - cycle.startDate.getTime();
      const remainingMs = estimatedEndDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(remainingMs / DAY_IN_MS);
      const progress = clamp(((now.getTime() - cycle.startDate.getTime()) / totalMs) * 100, 0, 100);

      return {
        cycleId: cycle.id,
        holdingId: cycle.holdingId,
        holdingName: cycle.holding.name,
        ticker: cycle.holding.ticker,
        cycleNumber: cycle.cycleNumber,
        startDate: cycle.startDate.toISOString(),
        estimatedEndDate: estimatedEndDate.toISOString(),
        daysRemaining,
        progress,
      };
    })
    .filter((cycle) => cycle.daysRemaining <= ALERT_THRESHOLD_DAYS)
    .sort((a, b) => {
      if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
      return new Date(a.estimatedEndDate).getTime() - new Date(b.estimatedEndDate).getTime();
    });

  if (alerts.length === 0) {
    return NextResponse.json({ alert: null });
  }

  return NextResponse.json({
    alert: {
      ...alerts[0],
      additionalCount: alerts.length - 1,
    },
  });
}
