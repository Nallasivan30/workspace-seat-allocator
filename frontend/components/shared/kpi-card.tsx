import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value?: string | number | null;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  description?: string;
  isLoading?: boolean;
  loading?: boolean;
}

export function KpiCard({ title, value, icon, isLoading = false, loading = false, description }: KpiCardProps) {
  const showLoading = isLoading || loading;
  if (showLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="mt-2">
            <div className="h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderIcon = () => {
    if (!icon) return null;
    // Check if it's a function or class component
    if (typeof icon === "function" || (typeof icon === "object" && icon !== null && !React.isValidElement(icon))) {
      const Icon = icon as React.ComponentType<{ className?: string }>;
      return <Icon className="h-4.5 w-4.5" />;
    }
    return icon;
  };

  return (
    <Card className="overflow-hidden bg-white/70 backdrop-blur-xs dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 hover:scale-[1.01]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-zinc-550 dark:text-zinc-400">{title}</p>
          {icon && <div className="text-zinc-500 dark:text-zinc-400">{renderIcon()}</div>}
        </div>
        <div className="mt-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">{value}</h2>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
