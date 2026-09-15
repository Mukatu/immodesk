import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/owner_payout.dart';
import '../../domain/entities/owner_statement_summary.dart';
import '../../domain/entities/payment_method.dart';
import '../../domain/entities/payout_status.dart';
import '../../domain/entities/portal_profile.dart';
import '../../domain/entities/statement_status.dart';
import '../../domain/payout_delay_estimate.dart';
import '../controllers/landlord_portal_lists_controllers.dart';
import '../controllers/landlord_portal_profile_controller.dart';

/// Accueil de l'espace bailleur : solde à percevoir, dernier relevé,
/// dernier reversement. Pour un bailleur hors du Congo, mode de
/// reversement et délai estimé (`docs/04_plan_de_phases.md` §7.6).
/// Aucune action d'écriture n'est proposée sur cet écran ni sur l'espace.
class LandlordHomeScreen extends ConsumerWidget {
  const LandlordHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(landlordPortalProfileControllerProvider);
    final statementsAsync = ref.watch(landlordStatementsProvider);
    final payoutsAsync = ref.watch(landlordPayoutsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mon espace bailleur')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(landlordStatementsProvider);
          ref.invalidate(landlordPayoutsProvider);
          await Future.wait([
            ref.read(landlordStatementsProvider.future),
            ref.read(landlordPayoutsProvider.future),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            profileAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => _ErrorText(error),
              data: (profile) {
                if (profile == null) {
                  return const Text('Profil bailleur indisponible.');
                }
                return Text(
                  profile.landlord.displayName,
                  style: Theme.of(context).textTheme.titleLarge,
                );
              },
            ),
            const SizedBox(height: 16),
            statementsAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => _ErrorText(error),
              data: (statements) => _BalanceCard(statements: statements),
            ),
            const SizedBox(height: 12),
            statementsAsync.maybeWhen(
              data: (statements) => _LastStatementCard(
                statement: mostRecentStatement(statements),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
            const SizedBox(height: 12),
            payoutsAsync.when(
              loading: () => const SizedBox.shrink(),
              error: (error, _) => _ErrorText(error),
              data: (payouts) =>
                  _LastPayoutCard(payout: mostRecentPayout(payouts)),
            ),
            const SizedBox(height: 12),
            profileAsync.maybeWhen(
              data: (profile) => profile != null && profile.landlord.isDiaspora
                  ? _DiasporaBanner(payoutMethod: profile.landlord.payoutMethod)
                  : const SizedBox.shrink(),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.statements});

  final List<OwnerStatementSummary> statements;

  @override
  Widget build(BuildContext context) {
    final int balance = outstandingBalance(statements);
    return Card(
      key: const ValueKey('landlord-balance-card'),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Solde à percevoir',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 4),
            MoneyXafText(
              balance,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _LastStatementCard extends StatelessWidget {
  const _LastStatementCard({required this.statement});

  final OwnerStatementSummary? statement;

  @override
  Widget build(BuildContext context) {
    if (statement == null) {
      return const Text('Aucun relevé de gérance pour le moment.');
    }
    return Card(
      key: const ValueKey('landlord-last-statement-card'),
      child: ListTile(
        title: Text('Dernier relevé : ${statement!.statementNumber}'),
        subtitle: MoneyXafText(statement!.netPayableAmount),
        trailing: StatusBadge(
          label: statement!.status.label,
          tone: statement!.status.tone,
        ),
      ),
    );
  }
}

class _LastPayoutCard extends StatelessWidget {
  const _LastPayoutCard({required this.payout});

  final OwnerPayout? payout;

  @override
  Widget build(BuildContext context) {
    if (payout == null) {
      return const Text('Aucun reversement perçu pour le moment.');
    }
    return Card(
      key: const ValueKey('landlord-last-payout-card'),
      child: ListTile(
        title: Text('Dernier reversement : ${payout!.reference}'),
        subtitle: MoneyXafText(payout!.netAmount),
        trailing: StatusBadge(
          label: payout!.status.label,
          tone: payout!.status.tone,
        ),
      ),
    );
  }
}

class _DiasporaBanner extends StatelessWidget {
  const _DiasporaBanner({required this.payoutMethod});

  final PaymentMethod payoutMethod;

  @override
  Widget build(BuildContext context) {
    return Card(
      key: const ValueKey('landlord-diaspora-banner'),
      color: Theme.of(context).colorScheme.secondaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bailleur résidant hors du Congo',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 4),
            Text('Mode de reversement : ${payoutMethod.label}'),
            Text('Délai estimé : ${estimatedPayoutDelayLabel(payoutMethod)}'),
          ],
        ),
      ),
    );
  }
}

class _ErrorText extends StatelessWidget {
  const _ErrorText(this.error);

  final Object error;

  @override
  Widget build(BuildContext context) {
    final String message = error is ApiException
        ? (error as ApiException).message
        : 'Une erreur est survenue.';
    return Text(
      message,
      style: TextStyle(color: Theme.of(context).colorScheme.error),
    );
  }
}
