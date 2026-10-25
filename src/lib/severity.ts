import type { Severity } from "@/lib/domain/types";

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ff3c3c",
  high: "#ff8c3c",
  medium: "#ffcc3c",
  low: "#3c9dff",
  info: "#6b7380",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};
