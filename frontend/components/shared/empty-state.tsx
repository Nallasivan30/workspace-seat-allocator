import * as React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = "No data found",
  description = "There are no records to display at the moment.",
  icon = <FolderOpen className="h-10 w-10 text-zinc-400" />,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
        {title}
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
