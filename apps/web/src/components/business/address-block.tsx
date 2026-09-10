import { cn } from '@/lib/utils';

export interface AddressBlockProps {
  addressLine?: string | null;
  district?: string | null;
  arrondissement?: string | null;
  landmark?: string | null;
  city?: string | null;
  className?: string;
}

interface Field {
  label: string;
  value?: string | null;
}

/** Bloc de définition (dl) affichant une adresse congolaise ; masque les champs vides. */
export function AddressBlock({
  addressLine,
  district,
  arrondissement,
  landmark,
  city,
  className,
}: AddressBlockProps) {
  const fields: Field[] = [
    { label: 'Ville', value: city },
    { label: 'Arrondissement', value: arrondissement },
    { label: 'Quartier', value: district },
    { label: 'Adresse', value: addressLine },
    { label: 'Repère', value: landmark },
  ].filter((field) => Boolean(field.value && field.value.trim()));

  if (fields.length === 0) return null;

  return (
    <dl className={cn('grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm', className)}>
      {fields.map((field) => (
        <div key={field.label} className="contents">
          <dt className="font-medium text-muted-foreground">{field.label}</dt>
          <dd className="text-foreground">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
