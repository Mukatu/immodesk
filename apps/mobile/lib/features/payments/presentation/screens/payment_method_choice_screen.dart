import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../controllers/payment_method_choice_controller.dart';

/// Depuis une facture de la tournée : choix du mode de paiement selon les
/// instructions de paiement (`docs/api/phase4-contract.md`) — espèces
/// (encaissement existant), Mobile Money déclaré, virement déclaré, et
/// Mobile Money par agrégateur si disponible.
class PaymentMethodChoiceScreen extends ConsumerWidget {
  const PaymentMethodChoiceScreen({super.key, required this.invoiceId});

  final String invoiceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateAsync = ref.watch(
      paymentMethodChoiceControllerProvider(invoiceId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Mode de paiement')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          if (state.isOfflineBlocked) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  paymentMethodChoiceOfflineMessage,
                  key: const ValueKey('payment-method-offline-message'),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return ListView(
            key: const ValueKey('payment-method-choice-list'),
            padding: const EdgeInsets.all(16),
            children: [
              if (state.invoice != null)
                Card(
                  child: ListTile(
                    title: Text(state.invoice!.tenant.displayName),
                    subtitle: Text(
                      state.invoice!.invoiceNumber ?? state.invoice!.id,
                    ),
                    trailing: MoneyXafText(state.invoice!.balanceAmount),
                  ),
                ),
              const SizedBox(height: 8),
              ListTile(
                key: const ValueKey('payment-method-cash'),
                leading: const Icon(Icons.payments_outlined),
                title: const Text('Espèces'),
                subtitle: const Text('Encaissement avec signature ou reçu'),
                onTap: () =>
                    context.push(RoutePaths.collectionEncaissement(invoiceId)),
              ),
              if (state.canDeclareMobileMoney)
                ListTile(
                  key: const ValueKey('payment-method-momo-declared'),
                  leading: const Icon(Icons.phone_android_outlined),
                  title: const Text('Mobile Money déclaré'),
                  subtitle: const Text(
                    'Le locataire a déjà payé et déclare sa référence',
                  ),
                  onTap: () =>
                      context.push(RoutePaths.momoDeclaration(invoiceId)),
                ),
              if (state.canDeclareBankTransfer)
                ListTile(
                  key: const ValueKey('payment-method-bank-transfer'),
                  leading: const Icon(Icons.account_balance_outlined),
                  title: const Text('Virement bancaire'),
                  subtitle: const Text('Déclaration avec preuve obligatoire'),
                  onTap: () => context.push(
                    RoutePaths.bankTransferDeclaration(invoiceId),
                  ),
                ),
              if (state.canUseAggregator)
                ListTile(
                  key: const ValueKey('payment-method-momo-aggregator'),
                  leading: const Icon(Icons.bolt_outlined),
                  title: const Text('Mobile Money immédiat'),
                  subtitle: const Text('Paiement déclenché depuis le lieu'),
                  onTap: () =>
                      context.push(RoutePaths.momoAggregator(invoiceId)),
                ),
            ],
          );
        },
      ),
    );
  }
}
