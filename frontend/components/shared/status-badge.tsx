import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/lib/formatters";

interface StatusBadgeProps {
  status: string;
  type?: "employee" | "project" | "seat" | "general";
}

export function StatusBadge({ status, type = "general" }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  const getVariant = () => {
    switch (type) {
      case "employee":
        if (normalizedStatus === "active") return "success";
        if (normalizedStatus === "on_leave") return "warning";
        if (normalizedStatus === "exited") return "destructive";
        break;
      case "project":
        if (normalizedStatus === "active") return "success";
        if (normalizedStatus === "on_hold") return "warning";
        if (normalizedStatus === "closed") return "destructive";
        break;
      case "seat":
        if (normalizedStatus === "available") return "success";
        if (normalizedStatus === "occupied") return "default";
        if (normalizedStatus === "reserved") return "info";
        if (normalizedStatus === "maintenance") return "warning";
        break;
    }

    // Fallbacks
    if (["active", "available", "success", "open", "true"].includes(normalizedStatus)) return "success";
    if (["on_leave", "on_hold", "maintenance", "pending", "warning"].includes(normalizedStatus)) return "warning";
    if (["exited", "closed", "inactive", "false", "failed"].includes(normalizedStatus)) return "destructive";
    if (["occupied", "reserved", "info"].includes(normalizedStatus)) return "info";

    return "secondary";
  };

  return <Badge variant={getVariant()}>{formatStatus(status)}</Badge>;
}
