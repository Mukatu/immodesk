import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/db/app_database.dart';
import '../../../core/network/dio_provider.dart';
import '../domain/repositories/portfolio_repository.dart';
import 'datasources/portfolio_remote_data_source.dart';
import 'repositories/portfolio_repository_impl.dart';

part 'portfolio_providers.g.dart';

@riverpod
PortfolioRemoteDataSource portfolioRemoteDataSource(Ref ref) {
  return PortfolioRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
PortfolioRepository portfolioRepository(Ref ref) {
  return PortfolioRepositoryImpl(
    ref.watch(portfolioRemoteDataSourceProvider),
    ref.watch(appDatabaseProvider),
  );
}
