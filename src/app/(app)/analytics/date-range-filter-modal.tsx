'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangeFilterModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onApply: (range: DateRange | undefined) => void;
  currentRange: DateRange | undefined;
}

const PresetButton = ({
  label,
  onClick,
  isActive,
}: {
  label: string;
  onClick: () => void;
  isActive?: boolean;
}) => (
  <Button
    variant="ghost"
    className={cn(
      'justify-start w-full text-left p-3 h-auto text-base rounded-md',
      isActive && 'bg-primary/10 text-primary font-semibold'
    )}
    onClick={onClick}
  >
    {label}
  </Button>
);

export function DateRangeFilterModal({
  isOpen,
  setIsOpen,
  onApply,
  currentRange,
}: DateRangeFilterModalProps) {
  const [range, setRange] = useState<DateRange | undefined>(currentRange);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRange(currentRange);
      setActivePreset(null);
    }
  }, [currentRange, isOpen]);

  const handlePresetClick = (preset: string, newRange: DateRange) => {
    setRange(newRange);
    setActivePreset(preset);
  };

  const presets = {
    hoy: () => handlePresetClick('hoy', { from: new Date(), to: new Date() }),
    ayer: () =>
      handlePresetClick('ayer', { from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
    estaSemana: () =>
      handlePresetClick('estaSemana', {
        from: startOfWeek(new Date(), { locale: es }),
        to: endOfWeek(new Date(), { locale: es }),
      }),
    semanaPasada: () => {
      const lastWeek = subWeeks(new Date(), 1);
      handlePresetClick('semanaPasada', {
        from: startOfWeek(lastWeek, { locale: es }),
        to: endOfWeek(lastWeek, { locale: es }),
      });
    },
    esteMes: () =>
      handlePresetClick('esteMes', { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    mesPasado: () => {
      const lastMonth = subMonths(new Date(), 1);
      handlePresetClick('mesPasado', {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      });
    },
    esteAno: () =>
      handlePresetClick('esteAno', { from: startOfYear(new Date()), to: endOfYear(new Date()) }),
    anoPasado: () => {
      const lastYear = subYears(new Date(), 1);
      handlePresetClick('anoPasado', {
        from: startOfYear(lastYear),
        to: endOfYear(lastYear),
      });
    },
  };

  const handleApply = () => {
    onApply(range);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 flex flex-col h-screen sm:h-auto">
        <DialogHeader className="p-4 flex-row items-center justify-between border-b">
          <DialogTitle className="font-semibold text-lg">Filtro de fecha</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <CalendarComponent
            mode="range"
            selected={range}
            onSelect={(selectedRange) => {
              setRange(selectedRange);
              setActivePreset(null);
            }}
            numberOfMonths={1}
            locale={es}
            className="p-0 rounded-md border"
          />

          <div className="grid grid-cols-2 gap-2">
            <PresetButton label="Hoy" onClick={presets.hoy} isActive={activePreset === 'hoy'} />
            <PresetButton label="Ayer" onClick={presets.ayer} isActive={activePreset === 'ayer'} />
            <PresetButton
              label="Esta semana"
              onClick={presets.estaSemana}
              isActive={activePreset === 'estaSemana'}
            />
            <PresetButton
              label="Semana pasada"
              onClick={presets.semanaPasada}
              isActive={activePreset === 'semanaPasada'}
            />
            <PresetButton
              label="Este mes"
              onClick={presets.esteMes}
              isActive={activePreset === 'esteMes'}
            />
            <PresetButton
              label="Mes pasado"
              onClick={presets.mesPasado}
              isActive={activePreset === 'mesPasado'}
            />
            <PresetButton
              label="Este año"
              onClick={presets.esteAno}
              isActive={activePreset === 'esteAno'}
            />
            <PresetButton
              label="El año pasado"
              onClick={presets.anoPasado}
              isActive={activePreset === 'anoPasado'}
            />
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto">
          <Button className="w-full" size="lg" onClick={handleApply}>
            Aplicar Filtro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
