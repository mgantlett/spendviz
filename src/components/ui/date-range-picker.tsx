import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Button } from "./button";
import { Label } from "./label";

// Minimal calendar for date range selection (uses native input for now)
export interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, className }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={className + " flex items-center gap-2 min-w-[135px] w-[135px] justify-start px-2"}
          type="button"
        >
          <CalendarIcon className="w-4 h-4" />
          <span className="truncate text-left">
            {value.start && value.end
              ? `${value.start} – ${value.end}`
              : "Date range"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-popover text-popover-foreground border border-popover-foreground/10 dark:border-popover-foreground/20 p-3 rounded-md shadow w-40 z-50 min-w-0">
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">Start</Label>
          <input
            type="date"
            className="border border-input bg-popover text-popover-foreground rounded px-2 py-1"
            value={value.start}
            onChange={e => onChange({ ...value, start: e.target.value })}
            aria-label="Start date"
          />
          <Label className="text-xs font-medium">End</Label>
          <input
            type="date"
            className="border border-input bg-popover text-popover-foreground rounded px-2 py-1"
            value={value.end}
            onChange={e => onChange({ ...value, end: e.target.value })}
            aria-label="End date"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
