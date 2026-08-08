import type { components } from "@/lib/api/schema";

import { apiFetch, apiFetchBytes } from "./client";

export type SalesStatistics = components["schemas"]["SalesStatisticsDto"];
export type DailySalesStatistic =
  components["schemas"]["DailySalesStatisticDto"];
export type TopEventStatistic = components["schemas"]["TopEventStatisticDto"];
export type RevenueReportType = "SUMMARY" | "DETAIL";
export type RevenueReportScope = "admin" | "organizer";
export type RevenueReportRequest = {
  type: RevenueReportType;
  from: string;
  to: string;
};
export type RevenueReportDownload = {
  filename: string;
  bytes: Uint8Array<ArrayBuffer>;
};

export const statisticsKeys = {
  all: ["statistics"] as const,
  admin: () => [...statisticsKeys.all, "admin"] as const,
  organizer: () => [...statisticsKeys.all, "organizer"] as const,
};

export function getAdminStatistics(): Promise<SalesStatistics> {
  return apiFetch<SalesStatistics>("/admin/statistics");
}

export function getOrganizerStatistics(): Promise<SalesStatistics> {
  return apiFetch<SalesStatistics>("/organizer/statistics");
}

export async function downloadRevenueReport(
  scope: RevenueReportScope,
  request: RevenueReportRequest,
  language: string,
): Promise<RevenueReportDownload> {
  const query = new URLSearchParams(request).toString();
  const bytes = await apiFetchBytes(`/${scope}/statistics/export?${query}`, {
    headers: { "Accept-Language": language },
  });
  return {
    filename: `revenue-${request.type.toLowerCase()}_${request.from}_${request.to}.csv`,
    bytes,
  };
}
