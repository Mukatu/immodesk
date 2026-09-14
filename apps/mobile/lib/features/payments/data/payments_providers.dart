import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/payments_repository.dart';
import 'datasources/payments_remote_data_source.dart';
import 'repositories/payments_repository_impl.dart';

part 'payments_providers.g.dart';

@riverpod
PaymentsRemoteDataSource paymentsRemoteDataSource(Ref ref) {
  return PaymentsRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
PaymentsRepository paymentsRepository(Ref ref) {
  return PaymentsRepositoryImpl(ref.watch(paymentsRemoteDataSourceProvider));
}

/// Intervalle d'interrogation du statut d'une transaction agrégateur en
/// attente (`docs/api/phase4-contract.md` : toutes les 3 secondes).
/// Surchargeable dans les tests pour ne pas attendre le délai réel.
@riverpod
Duration momoPollInterval(Ref ref) => const Duration(seconds: 3);
