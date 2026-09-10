'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Star, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EmptyState } from '@/components/business/empty-state';
import { EnumSelect } from '@/components/business/enum-select';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import {
  useContactChannels,
  useCreateContactChannel,
  useDeleteContactChannel,
  useUpdateContactChannel,
} from '@/lib/api/hooks/use-contact-channels';
import { CONTACT_CHANNEL_TYPE_LABELS } from '@/lib/enum-labels';
import type { ContactChannel, ContactChannelType } from '@/lib/api/types';

const schema = z.object({
  channelType: z.enum(['PHONE', 'MOBILE', 'WHATSAPP', 'EMAIL', 'FAX']),
  value: z.string().min(1, 'Valeur requise.'),
  label: z.string().optional(),
  isPrimary: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  channelType: 'MOBILE',
  value: '',
  label: '',
  isPrimary: false,
};

function CreateChannelDialog({
  tenantId,
  open,
  onOpenChange,
}: {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createChannel = useCreateContactChannel('tenants', tenantId);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
      setServerError(null);
    }
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await createChannel.mutateAsync({
        channelType: values.channelType,
        value: values.value,
        label: values.label || undefined,
        isPrimary: values.isPrimary,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un canal de contact</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="channelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="channel-type">Type de canal</FormLabel>
                  <FormControl>
                    <EnumSelect
                      id="channel-type"
                      value={field.value}
                      onValueChange={field.onChange}
                      labels={CONTACT_CHANNEL_TYPE_LABELS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="channel-value">Valeur</FormLabel>
                  <FormControl>
                    <Input id="channel-value" placeholder="+242066000001 ou e-mail" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="channel-label">Libellé (optionnel)</FormLabel>
                  <FormControl>
                    <Input id="channel-label" placeholder="Bureau, domicile…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="channel-isPrimary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormControl>
                  <FormLabel htmlFor="channel-isPrimary" className="!mt-0">
                    Canal préféré pour ce type
                  </FormLabel>
                </FormItem>
              )}
            />
            {serverError ? (
              <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
                {serverError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createChannel.isPending}>
                {createChannel.isPending ? 'Ajout…' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChannelRow({ tenantId, channel }: { tenantId: string; channel: ContactChannel }) {
  const updateChannel = useUpdateContactChannel('tenants', tenantId);
  const deleteChannel = useDeleteContactChannel('tenants', tenantId);

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          {channel.value}
          {channel.label ? <span className="text-muted-foreground"> ({channel.label})</span> : null}
        </p>
      </div>
      {channel.isPrimary ? (
        <Badge variant="secondary">Canal préféré</Badge>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => updateChannel.mutate({ id: channel.id, body: { isPrimary: true } })}
          disabled={updateChannel.isPending}
        >
          <Star className="mr-2 size-4" aria-hidden="true" />
          Définir comme préféré
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Supprimer le canal ${channel.value}`}
        onClick={() => deleteChannel.mutate(channel.id)}
        disabled={deleteChannel.isPending}
      >
        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
      </Button>
    </li>
  );
}

export function ContactChannelsSection({ tenantId }: { tenantId: string }) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isLoading } = useContactChannels('tenants', tenantId);
  const channels = React.useMemo(() => data?.items ?? [], [data]);

  const grouped = React.useMemo(() => {
    const groups = new Map<ContactChannelType, ContactChannel[]>();
    for (const channel of channels) {
      const list = groups.get(channel.channelType) ?? [];
      list.push(channel);
      groups.set(channel.channelType, list);
    }
    return groups;
  }, [channels]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Canaux de contact</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Ajouter un canal
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoading && channels.length === 0 ? (
          <EmptyState
            title="Aucun canal de contact"
            description="Ajoutez un téléphone, un e-mail ou un autre moyen de contact."
          />
        ) : (
          Array.from(grouped.entries()).map(([channelType, items]) => (
            <div key={channelType} className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {CONTACT_CHANNEL_TYPE_LABELS[channelType]}
              </h3>
              <ul>
                {items.map((channel) => (
                  <ChannelRow key={channel.id} tenantId={tenantId} channel={channel} />
                ))}
              </ul>
            </div>
          ))
        )}
      </CardContent>
      <CreateChannelDialog tenantId={tenantId} open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
}
