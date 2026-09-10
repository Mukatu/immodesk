'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { enumOptions } from '@/lib/enum-labels';

export interface EnumSelectProps<T extends string> {
  value: T | '';
  onValueChange: (value: T) => void;
  labels: Record<T, string>;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

/** Select générique pour une énumération du contrat d'API, avec libellés fr-CG. */
export function EnumSelect<T extends string>({
  value,
  onValueChange,
  labels,
  placeholder,
  id,
  disabled,
}: EnumSelectProps<T>) {
  const options = enumOptions(labels);

  return (
    <Select
      value={value || undefined}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
