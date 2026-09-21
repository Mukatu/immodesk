import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/referral_repository.dart';
import 'datasources/referral_remote_data_source.dart';
import 'repositories/referral_repository_impl.dart';

part 'referral_providers.g.dart';

@riverpod
ReferralRemoteDataSource referralRemoteDataSource(Ref ref) {
  return ReferralRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
ReferralRepository referralRepository(Ref ref) {
  return ReferralRepositoryImpl(ref.watch(referralRemoteDataSourceProvider));
}
