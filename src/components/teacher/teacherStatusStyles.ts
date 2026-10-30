import { TeacherDashboardStatus } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";

export function getTeacherStatusStyle(status: TeacherDashboardStatus | string) {
  switch (status) {
    case "Completed":
    case "completed":
      return { bg: AppTheme.colors.successTint, text: AppTheme.colors.successDeep };
    case "Processing":
    case "processing":
    case "Pending":
    case "pending":
      return { bg: AppTheme.colors.warningSoft, text: AppTheme.colors.warningText };
    case "Failed":
    case "failed":
      return { bg: AppTheme.colors.dangerSoft, text: AppTheme.colors.dangerStrong };
    case "No Recording":
    default:
      return { bg: AppTheme.colors.gray100, text: AppTheme.colors.textSecondary };
  }
}
