'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: React.ComponentProps<typeof Calendar>['disabled'];
  placeholder?: string;
  buttonClassName?: string;
  showIcon?: boolean;
}

export function DatePicker({
  date,
  setDate,
  disabled,
  placeholder = 'Elige una fecha',
  buttonClassName,
  showIcon = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            buttonClassName
          )}
        >
          {showIcon && <CalendarIcon className="mr-2 h-4 w-4" />}
          {date ? format(date, 'PPP', { locale: es }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          locale={es}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
