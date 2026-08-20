"use client";

import { Button } from "@/components/ui/button";
import type { CalendarViewMode } from "./calendar-logic";

interface CalendarToolbarProps {
  viewMode: CalendarViewMode;
  periodLabel: string;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarToolbar({
  viewMode,
  periodLabel,
  onViewModeChange,
  onPrev,
  onNext,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrev}
          data-testid="calendar-prev-button"
        >
          {viewMode === "week" ? "前週" : "前月"}
        </Button>
        <span className="text-sm font-medium">{periodLabel}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          data-testid="calendar-next-button"
        >
          {viewMode === "week" ? "次週" : "次月"}
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={viewMode === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("week")}
          data-testid="calendar-view-mode-week"
        >
          週表示
        </Button>
        <Button
          type="button"
          variant={viewMode === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("month")}
          data-testid="calendar-view-mode-month"
        >
          月表示
        </Button>
      </div>
    </div>
  );
}
