import { TeacherDashboardStatus } from "../../types/api";

export function getTeacherStatusStyle(status: TeacherDashboardStatus | string) {
  switch (status) {
    case "Completed":
    case "completed":
      return { bg: "#DCFCE7", text: "#15803D" };
    case "Processing":
    case "processing":
    case "Pending":
    case "pending":
      return { bg: "#FEF3C7", text: "#B45309" };
    case "Failed":
    case "failed":
      return { bg: "#FEE2E2", text: "#B91C1C" };
    case "No Recording":
    default:
      return { bg: "#F3F4F6", text: "#6B7280" };
  }
}
