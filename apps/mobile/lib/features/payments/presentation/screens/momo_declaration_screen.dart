import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/phone_number.dart';
import '../../domain/entities/momo_provider.dart';
import '../../domain/payments_offline_message.dart';
import '../controllers/momo_declaration_controller.dart';
import '../widgets/payment_proof_capture.dart';

/// Déclaration d'un paiement Mobile Money déjà effectué par le locataire
/// (mode déclaré, livré en priorité — `docs/api/phase4-contract.md`) :
/// numéro de réception, opérateur, numéro payeur, référence de
/// transaction, montant, capture d'écran facultative. Verrouillé dès le
/// premier appui, `clientRef` conservé entre deux tentatives.
class MomoDeclarationScreen extends ConsumerStatefulWidget {
  const MomoDeclarationScreen({super.key, required this.invoiceId});

  final String invoiceId;

  @override
  ConsumerState<MomoDeclarationScreen> createState() =>
      _MomoDeclarationScreenState();
}

class _MomoDeclarationScreenState extends ConsumerState<MomoDeclarationScreen> {
  final TextEditingController _amountController = TextEditingController();
  bool _amountInitialized = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = momoDeclarationControllerProvider(widget.invoiceId);
    final stateAsync = ref.watch(provider);

    return Scaffold(
      appBar: AppBar(title: const Text('Déclarer un paiement Mobile Money')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          if (state.isOfflineBlocked) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  PaymentsOfflineMessage.text,
                  key: const ValueKey('momo-declaration-offline-message'),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          if (state.result != null) {
            return const _MomoDeclarationPending();
          }
          if (!_amountInitialized) {
            _amountController.text = state.amount.toString();
            _amountInitialized = true;
          }
          final notifier = ref.read(provider.notifier);
          return ListView(
            key: const ValueKey('momo-declaration-form'),
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Numéro de réception',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              RadioGroup<String>(
                groupValue: state.selectedNumber?.bankAccountId,
                onChanged: (id) {
                  for (final number in state.receptionNumbers) {
                    if (number.bankAccountId == id) {
                      notifier.selectNumber(number);
                      break;
                    }
                  }
                },
                child: Column(
                  children: [
                    for (final number in state.receptionNumbers)
                      RadioListTile<String>(
                        key: ValueKey('momo-reception-${number.bankAccountId}'),
                        value: number.bankAccountId,
                        title: Text(formatCongoPhoneDisplay(number.msisdn)),
                        subtitle: Text(
                          '${number.provider.label} · ${number.holderName}',
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('momo-payer-msisdn-field'),
                decoration: const InputDecoration(
                  labelText: 'Numéro du payeur',
                  hintText: '+242 06 XXX XX XX',
                ),
                keyboardType: TextInputType.phone,
                onChanged: notifier.setPayerMsisdn,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const ValueKey('momo-operator-reference-field'),
                decoration: const InputDecoration(
                  labelText: "Référence de transaction de l'opérateur",
                ),
                textCapitalization: TextCapitalization.characters,
                onChanged: notifier.setOperatorReference,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const ValueKey('momo-amount-field'),
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Montant déclaré (FCFA)',
                ),
                onChanged: (value) =>
                    notifier.setAmount(int.tryParse(value) ?? 0),
              ),
              const SizedBox(height: 16),
              PaymentProofCapture(
                label: "Capture d'écran (facultatif)",
                filePath: state.proofFilePath,
                onCaptured: notifier.setProofFilePath,
                onCleared: () => notifier.setProofFilePath(null),
                folderName: 'momo_proofs',
              ),
              if (state.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  state.errorMessage!,
                  key: const ValueKey('momo-declaration-error'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                key: const ValueKey('submit-momo-declaration-button'),
                onPressed: state.canSubmit ? notifier.submit : null,
                child: state.isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Déclarer le paiement'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MomoDeclarationPending extends StatelessWidget {
  const _MomoDeclarationPending();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.hourglass_top_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            const Text(
              "Déclaration envoyée. En attente de validation par l'agence.",
              key: ValueKey('momo-declaration-pending-message'),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
