import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/onboarding_repository.dart';
import 'datasources/onboarding_remote_data_source.dart';
import 'repositories/onboarding_repository_impl.dart';

part 'onboarding_providers.g.dart';

@riverpod
OnboardingRemoteDataSource onboardingRemoteDataSource(Ref ref) {
  return OnboardingRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
OnboardingRepository onboardingRepository(Ref ref) {
  return OnboardingRepositoryImpl(
    ref.watch(onboardingRemoteDataSourceProvider),
  );
}
