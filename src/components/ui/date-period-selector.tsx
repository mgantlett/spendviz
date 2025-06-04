import React from 'react';
import { Button } from './button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './select';
import { Input } from './input';
import { CalendarIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { DATE_PERIODS } from './date-periods';

interface DatePeriodSelectorProps {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  onApply: () => void;
  onClear: () => void;
  className?: string;
  modal?: boolean;
  align?: 'start' | 'center' | 'end';
  initialPeriod?: string;
}

const DateSelectorContent = ({
  selectedPeriod,
  setSelectedPeriod,
  handlePeriodChange,
  startDate,
  endDate,
  handleDateChange,
  onClear,
  onApply,
  setOpen,
  setStartDate,
  setEndDate,
}: {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  handlePeriodChange: (period: string) => void;
  startDate: string;
  endDate: string;
  handleDateChange: (setter: (date: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onApply: () => void;
  setOpen: (open: boolean) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
}) => (
  <div className="flex flex-col gap-4">
    <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {DATE_PERIODS.map(period => (
          <SelectItem key={period.id} value={period.id}>
            {period.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    
    <div className="flex flex-col gap-2">
      <Input
        type="date"
        value={startDate}
        onChange={handleDateChange(setStartDate)}
        placeholder="Start date"
        className="w-[200px]"
      />
      <Input
        type="date"
        value={endDate}
        onChange={handleDateChange(setEndDate)}
        placeholder="End date"
        className="w-[200px]"
      />
    </div>

    <div className="flex justify-end gap-2">
      {(startDate || endDate) && (
        <Button variant="outline" onClick={() => {
          onClear();
          setSelectedPeriod('custom');
          setOpen(false);
        }} type="button">
          Clear
        </Button>
      )}
      <Button onClick={() => {
        onApply();
        setOpen(false);
      }} type="button">
        Apply
      </Button>
    </div>
  </div>
);

export function DatePeriodSelector({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onApply,
  onClear,
  className = '',
  modal = false,
  align = 'center',
  initialPeriod = 'custom'
}: DatePeriodSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState(initialPeriod);
  const [open, setOpen] = React.useState(false);
  const hasInitialized = React.useRef(false);

  const handlePeriodChange = React.useCallback((period: string) => {
    // Use local date to ensure we get the user's timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let start: Date;
    let end: Date = today; // Use today instead of now to avoid time portion

    switch (period) {
      case 'this_month':
        start = startOfMonth;
        end = today; // End at today, not end of month
        break;
      case 'past_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'past_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'past_year':
        start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
        break;
      case 'custom':
        // Don't change dates for custom selection
        return;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setSelectedPeriod(period);
    if (onApply) onApply();
  }, [setStartDate, setEndDate, setSelectedPeriod, onApply]);

  // Initialize with the selected period on mount only
  React.useEffect(() => {
    if (!hasInitialized.current && initialPeriod !== 'custom') {
      hasInitialized.current = true;
      handlePeriodChange(initialPeriod);
    }
  }, [initialPeriod, handlePeriodChange]);

  const handleDateChange = (setter: (date: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setSelectedPeriod('custom');
  };

  const displayValue = startDate && endDate
    ? `${startDate} – ${endDate}`
    : selectedPeriod !== 'custom'
      ? DATE_PERIODS.find(p => p.id === selectedPeriod)?.label
      : "Select dates";

  // Use non-modal display (inline)
  if (!modal) {
    return (
      <div className="flex gap-2 items-center">
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className={className || "w-[140px]"}>
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PERIODS.map(period => (
              <SelectItem key={period.id} value={period.id}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          type="date"
          value={startDate}
          onChange={handleDateChange(setStartDate)}
          placeholder="Start date"
          className="w-[140px]"
        />
        <Input
          type="date"
          value={endDate}
          onChange={handleDateChange(setEndDate)}
          placeholder="End date"
          className="w-[140px]"
        />
        <Button onClick={onApply}>Apply</Button>
        {(startDate || endDate) && (
          <Button variant="ghost" onClick={() => {
            onClear();
            setSelectedPeriod('custom');
          }}>
            Clear
          </Button>
        )}
      </div>
    );
  }

  // Use modal display (popover)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={className + " flex items-center gap-2 justify-start"}
          type="button"
        >
          <CalendarIcon className="w-4 h-4" />
          <span className="truncate text-left">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-fit bg-popover text-popover-foreground border rounded-md shadow-md p-4" 
        align={align}
        sideOffset={4}
      >
        <DateSelectorContent
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          handlePeriodChange={handlePeriodChange}
          startDate={startDate}
          endDate={endDate}
          handleDateChange={handleDateChange}
          onClear={onClear}
          onApply={onApply}
          setOpen={setOpen}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </PopoverContent>
    </Popover>
  );
}
