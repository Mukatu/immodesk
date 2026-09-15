import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/entities/collection_view.dart';
import '../../domain/entities/payment_method.dart';
import '../controllers/landlord_portal_lists_controllers.dart';

/// Liste des encaissements confirmés sur les biens du bailleur
/// (`GET /v1/portal/collections`, lecture seule).
class LandlordCollectionsScreen extends ConsumerWidget {
  const LandlordCollectionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final collectionsAsync = ref.watch(landlordCollectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes encaissements')),
      body: collectionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(
            error is ApiException ? error.message : 'Une erreur est survenue.',
          ),
        ),
        data: (collections) {
          if (collections.isEmpty) {
            return const EmptyState(
              title: 'Aucun encaissement',
              message: 'Les loyers encaissés confirmés apparaîtront ici.',
            );
          }
          return ListView.separated(
            key: const ValueKey('landlord-collections-list'),
            padding: const EdgeInsets.all(16),
            itemCount: collections.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) =>
                _CollectionTile(collection: collections[index]),
          );
        },
      ),
    );
  }
}

class _CollectionTile extends StatelessWidget {
  const _CollectionTile({required this.collection});

  final CollectionView collection;

  @override
  Widget build(BuildContext context) {
    return Card(
      key: ValueKey('landlord-collection-${collection.paymentId}'),
      child: ListTile(
        title: Text(collection.tenant.displayName),
        subtitle: Text(
          '${collection.unit.code} · ${collection.paymentDate} · ${collection.method.label}',
        ),
        trailing: MoneyXafText(collection.amount),
      ),
    );
  }
}
