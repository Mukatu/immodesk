import 'package:flutter/material.dart';

import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/entities/momo_provider.dart';
import '../controllers/momo_aggregator_controller.dart';
import '../controllers/momo_aggregator_state.dart';

/// Saisie du montant et du numéro payeur, opérateur détecté (06 → MTN,
/// 05 → Airtel), puis devis affiché avant validation (montant, frais,
/// total débité) — `docs/04_plan_de_phases.md` §4.6.
class MomoAggregatorInputView extends StatelessWidget {
  const MomoAggregatorInputView({
    super.key,
    required this.state,
    required this.notifier,
    required this.amountController,
  });

  final MomoAggregatorState state;
  final MomoAggregatorController notifier;
  final TextEditingController amountController;

  @override
  Widget build(BuildContext context) {
    return ListView(
      key: const ValueKey('momo-aggregator-input-form'),
      padding: const EdgeInsets.all(16),
      children: [
        TextFormField(
          key: const ValueKey('momo-aggregator-amount-field'),
          controller: amountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Montant (FCFA)'),
          onChanged: (value) => notifier.setAmount(int.tryParse(value) ?? 0),
        ),
        const SizedBox(height: 12),
        TextFormField(
          key: const ValueKey('momo-aggregator-msisdn-field'),
          decoration: const InputDecoration(
            labelText: 'Numéro payeur',
            hintText: '06 XXX XX XX ou 05 XXX XX XX',
          ),
          keyboardType: TextInputType.phone,
          onChanged: notifier.setPayerMsisdn,
        ),
        if (state.payerMsisdn.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            state.detectedOperator == null
                ? 'Opérateur non reconnu'
                : 'Opérateur détecté : ${state.detectedOperator!.label}',
            key: const ValueKey('momo-aggregator-detected-operator'),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
        const SizedBox(height: 16),
        OutlinedButton(
          key: const ValueKey('momo-aggregator-quote-button'),
          onPressed: state.canRequestQuote ? notifier.requestQuote : null,
          child: const Text('Voir le devis'),
        ),
        if (state.quote != null) ...[
          const SizedBox(height: 16),
          Card(
            key: const ValueKey('momo-aggregator-quote-card'),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _QuoteRow('Montant', state.quote!.amount),
                  _QuoteRow('Frais', state.quote!.feeAmount),
                  const Divider(),
                  _QuoteRow('Total débité', state.quote!.totalDebited),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            key: const ValueKey('momo-aggregator-confirm-button'),
            onPressed: state.canConfirm ? notifier.confirmAndInitiate : null,
            child: state.isBusy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Valider le paiement'),
          ),
        ],
        if (state.errorMessage != null) ...[
          const SizedBox(height: 8),
          Text(
            state.errorMessage!,
            key: const ValueKey('momo-aggregator-error'),
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
      ],
    );
  }
}

class _QuoteRow extends StatelessWidget {
  const _QuoteRow(this.label, this.amount);

  final String label;
  final int amount;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label), MoneyXafText(amount)],
      ),
    );
  }
}
