import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/payments_offline_message.dart';
import '../controllers/bank_transfer_declaration_controller.dart';
import '../widgets/payment_proof_capture.dart';

/// Déclaration d'un virement bancaire : montant, date, banque et nom du
/// payeur, référence (numéro de facture pré-rempli, copiable), preuve
/// obligatoire (photo ou fichier) — `docs/api/phase4-contract.md`.
class BankTransferDeclarationScreen extends ConsumerStatefulWidget {
  const BankTransferDeclarationScreen({super.key, required this.invoiceId});

  final String invoiceId;

  @override
  ConsumerState<BankTransferDeclarationScreen> createState() =>
      _BankTransferDeclarationScreenState();
}

class _BankTransferDeclarationScreenState
    extends ConsumerState<BankTransferDeclarationScreen> {
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  bool _initialized = false;

  @override
  void dispose() {
    _amountController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = bankTransferDeclarationControllerProvider(
      widget.invoiceId,
    );
    final stateAsync = ref.watch(provider);

    return Scaffold(
      appBar: AppBar(title: const Text('Déclarer un virement')),
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
                  key: const ValueKey('bank-transfer-offline-message'),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          if (state.result != null) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Déclaration de virement envoyée. En attente de '
                  'validation par la comptabilité.',
                  key: ValueKey('bank-transfer-pending-message'),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          if (!_initialized) {
            _amountController.text = state.amount.toString();
            _dateController.text = state.transferDate;
            _initialized = true;
          }
          final notifier = ref.read(provider.notifier);
          return ListView(
            key: const ValueKey('bank-transfer-form'),
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Compte bénéficiaire',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              RadioGroup<String>(
                groupValue: state.selectedAccount?.id,
                onChanged: (id) {
                  for (final account in state.bankAccounts) {
                    if (account.id == id) {
                      notifier.selectAccount(account);
                      break;
                    }
                  }
                },
                child: Column(
                  children: [
                    for (final account in state.bankAccounts)
                      RadioListTile<String>(
                        key: ValueKey('bank-account-${account.id}'),
                        value: account.id,
                        title: Text(account.bankName),
                        subtitle: Text(account.accountHolderName),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('bank-transfer-reference-field'),
                initialValue: state.transferReference,
                readOnly: true,
                decoration: InputDecoration(
                  labelText: 'Référence à indiquer au virement',
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.copy),
                    onPressed: () => Clipboard.setData(
                      ClipboardData(text: state.transferReference),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const ValueKey('bank-transfer-amount-field'),
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Montant du virement (FCFA)',
                ),
                onChanged: (value) =>
                    notifier.setAmount(int.tryParse(value) ?? 0),
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const ValueKey('bank-transfer-date-field'),
                controller: _dateController,
                decoration: const InputDecoration(
                  labelText: "Date d'exécution (AAAA-MM-JJ)",
                ),
                onChanged: notifier.setTransferDate,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const ValueKey('bank-transfer-payer-name-field'),
                decoration: const InputDecoration(labelText: 'Nom du payeur'),
                onChanged: notifier.setPayerName,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const ValueKey('bank-transfer-payer-bank-field'),
                decoration: const InputDecoration(
                  labelText: 'Banque du payeur (facultatif)',
                ),
                onChanged: notifier.setPayerBankName,
              ),
              const SizedBox(height: 16),
              PaymentProofCapture(
                label: "Avis d'opération (obligatoire)",
                filePath: state.proofFilePath,
                onCaptured: notifier.setProofFilePath,
                onCleared: () => notifier.setProofFilePath(null),
                folderName: 'transfer_proofs',
              ),
              if (state.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  state.errorMessage!,
                  key: const ValueKey('bank-transfer-error'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                key: const ValueKey('submit-bank-transfer-button'),
                onPressed: state.canSubmit ? notifier.submit : null,
                child: state.isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Déclarer le virement'),
              ),
            ],
          );
        },
      ),
    );
  }
}
