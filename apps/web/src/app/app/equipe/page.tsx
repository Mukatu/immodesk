'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Trash2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/business/page-header';
import { StatusBadge } from '@/components/business/status-badge';
import { PhoneInput } from '@/components/business/phone-input';
import { DataTable } from '@/components/business/data-table';
import { useContextPanel } from '@/components/layout/context-panel';
import { formatE164Congo, toE164Congo } from '@/lib/phone';
import { useAuth } from '@/lib/auth/auth-context';
import { useMembers, useRemoveMember, useUpdateMemberRole } from '@/lib/api/hooks/use-members';
import {
  useCreateInvitation,
  useInvitations,
  useRevokeInvitation,
} from '@/lib/api/hooks/use-invitations';
import type { Member, Invitation, Role } from '@/lib/api/types';

const ROLES: Role[] = ['OWNER', 'MANAGER', 'COLLECTOR', 'ACCOUNTANT', 'VIEWER'];

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Gestionnaire',
  COLLECTOR: 'Démarcheur',
  ACCOUNTANT: 'Comptable',
  VIEWER: 'Lecture seule',
};

const inviteSchema = z.object({
  localPhone: z.string().refine((v) => toE164Congo(v) !== null, 'Numéro invalide.'),
  role: z.enum(['OWNER', 'MANAGER', 'COLLECTOR', 'ACCOUNTANT', 'VIEWER']),
  fullName: z.string().optional(),
});

type InviteValues = z.infer<typeof inviteSchema>;

/** Initiales (2 lettres max) pour l'avatar du bloc `identity` du panneau contextuel. */
function memberInitials(fullName: string): string | undefined {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function InviteDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = React.useState(false);
  const createInvitation = useCreateInvitation(organizationId);
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { localPhone: '', role: 'VIEWER', fullName: '' },
  });

  async function onSubmit(values: InviteValues) {
    const phone = toE164Congo(values.localPhone);
    if (!phone) return;
    try {
      await createInvitation.mutateAsync({
        phone,
        role: values.role,
        fullName: values.fullName || undefined,
      });
      toast.success('Invitation envoyée par SMS.');
      form.reset({ localPhone: '', role: 'VIEWER', fullName: '' });
      setOpen(false);
    } catch {
      toast.error('Impossible d’envoyer l’invitation.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <UserPlus className="mr-2 size-4" aria-hidden="true" />
          Inviter un collaborateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un collaborateur</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="invite-fullname">Nom complet (optionnel)</FormLabel>
                  <FormControl>
                    <Input id="invite-fullname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="localPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="invite-phone">Numéro de téléphone</FormLabel>
                  <FormControl>
                    <PhoneInput
                      id="invite-phone"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="invite-role">Rôle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createInvitation.isPending}>
                {createInvitation.isPending ? 'Envoi…' : 'Envoyer l’invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function EquipePage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const { currentOrganizationId } = useAuth();
  const orgId = currentOrganizationId;
  const { data: membersData, isLoading: loadingMembers } = useMembers(orgId);
  const { data: invitationsData, isLoading: loadingInvitations } = useInvitations(orgId);
  const updateRole = useUpdateMemberRole(orgId);
  const removeMember = useRemoveMember(orgId);
  const revokeInvitation = useRevokeInvitation(orgId);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedMemberId(null);
  }, [isContextPanelOpen]);

  function handleMemberSelect(member: Member) {
    setSelectedMemberId(member.id);
    const joined = new Date(member.joinedAt);
    const daysSinceJoined = Math.max(0, Math.floor((Date.now() - joined.getTime()) / 86_400_000));
    openContextPanel({
      title: 'Membre de l’équipe',
      blocks: [
        {
          type: 'identity',
          title: member.user.fullName || 'Sans nom',
          subtitle: formatE164Congo(member.user.phone),
          initials: memberInitials(member.user.fullName || member.user.phone),
          badge: {
            label: member.status === 'ACTIVE' ? 'Actif' : 'Suspendu',
            tone: member.status === 'ACTIVE' ? 'ok' : 'warning',
          },
        },
        {
          type: 'keyvalue',
          title: 'Détail',
          items: [
            { k: 'Rôle', v: ROLE_LABELS[member.role] },
            { k: 'Téléphone', v: formatE164Congo(member.user.phone) },
            { k: 'Arrivée le', v: joined.toLocaleDateString('fr-CG') },
            { k: 'Ancienneté', v: `${daysSinceJoined} j` },
          ],
        },
        {
          type: 'actions',
          actions: [
            ...ROLES.filter((role) => role !== member.role).map((role) => ({
              label: `Définir comme ${ROLE_LABELS[role]}`,
              onSelect: () => {
                updateRole
                  .mutateAsync({ memberId: member.id, role })
                  .then(() => toast.success('Rôle mis à jour.'))
                  .catch((error: unknown) => {
                    toast.error(
                      error instanceof Error ? error.message : 'Impossible de changer le rôle.',
                    );
                  });
              },
            })),
            {
              label: 'Retirer de l’organisation',
              onSelect: () => {
                removeMember
                  .mutateAsync(member.id)
                  .then(() => toast.success('Membre retiré.'))
                  .catch((error: unknown) => {
                    toast.error(
                      error instanceof Error ? error.message : 'Impossible de retirer ce membre.',
                    );
                  });
              },
            },
          ],
        },
      ],
    });
  }

  const memberColumns = React.useMemo<ColumnDef<Member>[]>(
    () => [
      {
        header: 'Nom',
        accessorFn: (row) => row.user.fullName,
        cell: ({ row }) => row.original.user.fullName || '—',
      },
      {
        header: 'Téléphone',
        accessorFn: (row) => row.user.phone,
        cell: ({ row }) => formatE164Congo(row.original.user.phone),
      },
      {
        header: 'Rôle',
        cell: ({ row }) => {
          const member = row.original;
          return (
            <Select
              value={member.role}
              onValueChange={(role) => {
                updateRole
                  .mutateAsync({ memberId: member.id, role: role as Role })
                  .then(() => toast.success('Rôle mis à jour.'))
                  .catch((error) => {
                    toast.error(
                      error instanceof Error ? error.message : 'Impossible de changer le rôle.',
                    );
                  });
              }}
            >
              <SelectTrigger aria-label={`Rôle de ${member.user.fullName}`} className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        header: 'Statut',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Retirer ${row.original.user.fullName}`}
            onClick={() => {
              removeMember
                .mutateAsync(row.original.id)
                .then(() => toast.success('Membre retiré.'))
                .catch((error) => {
                  toast.error(
                    error instanceof Error ? error.message : 'Impossible de retirer ce membre.',
                  );
                });
            }}
          >
            <Trash2 className="size-4 text-destructive" aria-hidden="true" />
          </Button>
        ),
      },
    ],
    [updateRole, removeMember],
  );

  const invitationColumns = React.useMemo<ColumnDef<Invitation>[]>(
    () => [
      { header: 'Téléphone', cell: ({ row }) => formatE164Congo(row.original.phone) },
      { header: 'Rôle', cell: ({ row }) => ROLE_LABELS[row.original.role] },
      { header: 'Statut', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: 'Actions',
        cell: ({ row }) =>
          row.original.status === 'PENDING' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                revokeInvitation
                  .mutateAsync(row.original.id)
                  .then(() => toast.success('Invitation révoquée.'))
                  .catch(() => toast.error('Impossible de révoquer l’invitation.'));
              }}
            >
              Révoquer
            </Button>
          ) : null,
      },
    ],
    [revokeInvitation],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Équipe"
        description="Membres de l’organisation et invitations en attente."
        actions={orgId ? <InviteDialog organizationId={orgId} /> : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Membres</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={memberColumns}
            data={membersData?.items ?? []}
            isLoading={loadingMembers}
            emptyTitle="Aucun membre"
            emptyDescription="Invitez un collaborateur pour commencer."
            onRowSelect={handleMemberSelect}
            getRowLabel={(member) => `Voir le détail de ${member.user.fullName || 'ce membre'}`}
            getRowClassName={(member) =>
              member.id === selectedMemberId
                ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={invitationColumns}
            data={invitationsData?.items ?? []}
            isLoading={loadingInvitations}
            emptyTitle="Aucune invitation en attente"
          />
        </CardContent>
      </Card>
    </div>
  );
}
