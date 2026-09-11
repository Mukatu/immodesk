'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NOTIFICATION_CHANNEL_LABELS } from '@/lib/enum-labels';
import { useUpdateNotificationTemplate } from '@/lib/api/hooks/use-notification-templates';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { NotificationTemplate } from '@/lib/api/types';
import { TestTemplateDialog } from './test-template-dialog';

const VARIABLES_HINT =
  'Variables disponibles : {{tenantName}}, {{amount}}, {{period}}, {{receiptNumber}}, {{link}}, {{organizationName}}';

export interface TemplateCardProps {
  template: NotificationTemplate;
}

/** Carte d'édition d'un gabarit de notification (un canal). */
export function TemplateCard({ template }: TemplateCardProps) {
  const updateTemplate = useUpdateNotificationTemplate(template.id);
  const [body, setBody] = React.useState(template.body);
  const [providerTemplateName, setProviderTemplateName] = React.useState(
    template.providerTemplateName ?? '',
  );
  const [providerTemplateLang, setProviderTemplateLang] = React.useState(
    template.providerTemplateLang ?? '',
  );
  const [isActive, setIsActive] = React.useState(template.isActive);

  async function handleSave() {
    try {
      await updateTemplate.mutateAsync({
        body,
        providerTemplateName: providerTemplateName || undefined,
        providerTemplateLang: providerTemplateLang || undefined,
        isActive,
      });
      toast.success('Gabarit mis à jour.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">{NOTIFICATION_CHANNEL_LABELS[template.channel]}</CardTitle>
        {!isActive ? <Badge variant="outline">Inactif</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`body-${template.id}`} className="flex items-center gap-1">
            Corps du message
            <span title={VARIABLES_HINT}>
              <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
          </Label>
          <Textarea
            id={`body-${template.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{VARIABLES_HINT}</p>
        </div>

        {template.channel === 'WHATSAPP' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`ptn-${template.id}`}>Nom du gabarit Meta</Label>
              <Input
                id={`ptn-${template.id}`}
                value={providerTemplateName}
                onChange={(e) => setProviderTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ptl-${template.id}`}>Langue Meta</Label>
              <Input
                id={`ptl-${template.id}`}
                value={providerTemplateLang}
                onChange={(e) => setProviderTemplateLang(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Gabarit actif
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleSave} disabled={updateTemplate.isPending}>
            {updateTemplate.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <TestTemplateDialog templateId={template.id} />
        </div>
      </CardContent>
    </Card>
  );
}
