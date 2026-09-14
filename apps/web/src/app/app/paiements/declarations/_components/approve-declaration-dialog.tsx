'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/business/money-input';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface ApproveDeclarationDialogProps {
  /** Montant déclaré, pré-rempli dans le champ « montant corrigé ». */
  declaredAmount: number;
  onApprove: (input: { approvedAmount?: number; reason?: string }) => Promise<unknown>;
  onApproved?: () => void;
}

/**
 * Le motif est obligatoire dès que le montant validé diffère du montant
 * déclaré (docs/api/phase4-contract.md, « Mobile Money déclaré » et
 * « Virement déclaré » : « motif obligatoire si différent, audité ») —
 * sinon l'API refuse la validation.
 */
function buildApproveSchema(declaredAmount: number) {
  return z
    .object({
      amount: z.number().nullable(),
      reason: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.amount === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'Le montant est requis.',
        });
        return;
      }
      if (values.amount !== declaredAmount && !values.reason.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'Le motif est obligatoire lorsque le montant validé diffère du montant déclaré.',
        });
      }
    });
}

type ApproveFormValues = z.infer<ReturnType<typeof buildApproveSchema>>;

/**
 * Formulaire de validation d'une déclaration (Mobile Money ou virement) :
 * montant corrigé modifiable (contrat : « montant corrigé possible à la
 * validation, motif audité ») et motif obligatoire seulement si le montant
 * corrigé diffère du montant déclaré. La validation crée le paiement côté
 * API — aucune création côté écran.
 */
export function ApproveDeclarationDialog({
  declaredAmount,
  onApprove,
  onApproved,
}: ApproveDeclarationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const schema = React.useMemo(() => buildApproveSchema(declaredAmount), [declaredAmount]);

  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: declaredAmount, reason: '' },
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ amount: declaredAmount, reason: '' });
      setError(null);
    }
  }, [open, declaredAmount, form]);

  const [watchedAmount, watchedReason] = form.watch(['amount', 'reason']);
  const amountChanged = watchedAmount !== null && watchedAmount !== declaredAmount;
  const reasonRequiredAndMissing = amountChanged && !watchedReason.trim();
  const submitDisabled = isSubmitting || watchedAmount === null || reasonRequiredAndMissing;

  async function onSubmit(values: ApproveFormValues) {
    setError(null);
    setIsSubmitting(true);
    try {
      await onApprove({
        approvedAmount: values.amount !== declaredAmount ? (values.amount ?? undefined) : undefined,
        reason: values.reason.trim() || undefined,
      });
      toast.success('Déclaration validée, le paiement a été créé.');
      setOpen(false);
      onApproved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Valider</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider cette déclaration</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="approveAmount">Montant corrigé</FormLabel>
                  <FormControl>
                    <MoneyInput
                      id="approveAmount"
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Le motif dépend du montant (validation croisée) : le
                        // champ motif n'étant pas modifié ici, sa validation
                        // ne se redéclenche pas seule — on la force.
                        void form.trigger('reason');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="approveReason">
                    Motif {amountChanged ? '(obligatoire, montant modifié)' : '(facultatif)'}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      id="approveReason"
                      {...field}
                      placeholder={
                        amountChanged ? 'Écart avec le montant déclaré, justifié par…' : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={submitDisabled}>
                {isSubmitting ? 'Validation…' : 'Confirmer la validation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
