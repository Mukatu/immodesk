import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../controllers/remittance_creation_controller.dart';

/// Coupures usuelles en circulation en zone CEMAC (XAF), pour la saisie
/// optionnelle des espèces remises (`CashSettings.denominationsEnabled`).
const List<int> _standardDenominations = [10000, 5000, 2000, 1000, 500];

/// Création d'une remise : sélection des reçus non remis, montant
/// déclaré, coupures optionnelles, soumission (statut `SUBMITTED` direct).
class RemittanceCreationScreen extends ConsumerStatefulWidget {
  const RemittanceCreationScreen({super.key});

  @override
  ConsumerState<RemittanceCreationScreen> createState() =>
      _RemittanceCreationScreenState();
}

class _RemittanceCreationScreenState
    extends ConsumerState<RemittanceCreationScreen> {
  final TextEditingController _amountController = TextEditingController();
  bool _amountInitialized = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stateAsync = ref.watch(remittanceCreationControllerProvider);
    final notifier = ref.read(remittanceCreationControllerProvider.notifier);

    ref.listen(remittanceCreationControllerProvider, (previous, next) {
      final result = next.value?.result;
      if (result != null && previous?.value?.result == null) {
        context.pop();
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Nouvelle remise')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          if (state.receipts.isEmpty) {
            return const EmptyState(
              title: 'Aucun reçu à remettre',
              message: 'Tous vos reçus ont déjà été remis.',
            );
          }
          if (!_amountInitialized) {
            _amountController.text = state.declaredAmount.toString();
            _amountInitialized = true;
          }
          return ListView(
            key: const ValueKey('remittance-creation-form'),
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Reçus à remettre',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              for (final receipt in state.receipts)
                CheckboxListTile(
                  key: ValueKey('remittance-receipt-checkbox-${receipt.id}'),
                  value: state.selectedReceiptIds.contains(receipt.id),
                  onChanged: (_) => notifier.toggleReceipt(receipt.id),
                  title: Text(receipt.receiptNumber),
                  subtitle: Text(receipt.tenant.displayName),
                  secondary: MoneyXafText(receipt.amount),
                ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total attendu'),
                  MoneyXafText(state.expectedAmount),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('declared-amount-field'),
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Montant déclaré (FCFA)',
                ),
                onChanged: (value) =>
                    notifier.setDeclaredAmount(int.tryParse(value) ?? 0),
              ),
              const SizedBox(height: 16),
              Text(
                'Coupures (optionnel)',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              for (final note in _standardDenominations)
                _DenominationRow(noteValue: note, notifier: notifier),
              if (state.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  state.errorMessage!,
                  key: const ValueKey('remittance-error'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                key: const ValueKey('submit-remittance-button'),
                onPressed:
                    state.isSubmitting || state.selectedReceiptIds.isEmpty
                    ? null
                    : notifier.submit,
                child: state.isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Soumettre la remise'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DenominationRow extends StatelessWidget {
  const _DenominationRow({required this.noteValue, required this.notifier});

  final int noteValue;
  final RemittanceCreationController notifier;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: MoneyXafText(noteValue)),
          SizedBox(
            width: 80,
            child: TextFormField(
              key: ValueKey('denomination-field-$noteValue'),
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(hintText: '0'),
              onChanged: (value) => notifier.setDenomination(
                noteValue.toString(),
                int.tryParse(value) ?? 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
