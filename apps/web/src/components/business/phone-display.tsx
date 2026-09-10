import { MessageCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatE164Congo } from '@/lib/phone';

export interface PhoneDisplayProps {
  /** Numéro au format E.164 congolais, ex. "+242066123456". */
  phone: string;
  /** Affiche en plus un lien WhatsApp (wa.me) à côté du numéro. */
  whatsapp?: boolean;
  className?: string;
}

/** Affiche un numéro congolais formaté, cliquable (tel:), avec lien WhatsApp optionnel. */
export function PhoneDisplay({ phone, whatsapp = false, className }: PhoneDisplayProps) {
  if (!phone) return null;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <a href={`tel:${phone}`} className="tabular-nums hover:underline">
        {formatE164Congo(phone)}
      </a>
      {whatsapp ? (
        <a
          href={`https://wa.me/${phone.replace('+', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter sur WhatsApp"
          className="text-muted-foreground hover:text-success"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
        </a>
      ) : null}
    </span>
  );
}
