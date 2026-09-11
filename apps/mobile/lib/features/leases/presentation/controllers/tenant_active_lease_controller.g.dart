// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenant_active_lease_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) dont ce locataire est le
/// locataire principal, affiché dans sa fiche (`TenantDetailScreen`).

@ProviderFor(TenantActiveLeaseController)
final tenantActiveLeaseControllerProvider =
    TenantActiveLeaseControllerFamily._();

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) dont ce locataire est le
/// locataire principal, affiché dans sa fiche (`TenantDetailScreen`).
final class TenantActiveLeaseControllerProvider
    extends
        $AsyncNotifierProvider<
          TenantActiveLeaseController,
          TenantActiveLeaseState
        > {
  /// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) dont ce locataire est le
  /// locataire principal, affiché dans sa fiche (`TenantDetailScreen`).
  TenantActiveLeaseControllerProvider._({
    required TenantActiveLeaseControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'tenantActiveLeaseControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$tenantActiveLeaseControllerHash();

  @override
  String toString() {
    return r'tenantActiveLeaseControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  TenantActiveLeaseController create() => TenantActiveLeaseController();

  @override
  bool operator ==(Object other) {
    return other is TenantActiveLeaseControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$tenantActiveLeaseControllerHash() =>
    r'480f4eca9db673c565e8b0e2cb089d992bd821a0';

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) dont ce locataire est le
/// locataire principal, affiché dans sa fiche (`TenantDetailScreen`).

final class TenantActiveLeaseControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          TenantActiveLeaseController,
          AsyncValue<TenantActiveLeaseState>,
          TenantActiveLeaseState,
          FutureOr<TenantActiveLeaseState>,
          String
        > {
  TenantActiveLeaseControllerFamily._()
    : super(
        retry: null,
        name: r'tenantActiveLeaseControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) dont ce locataire est le
  /// locataire principal, affiché dans sa fiche (`TenantDetailScreen`).

  TenantActiveLeaseControllerProvider call(String tenantId) =>
      TenantActiveLeaseControllerProvider._(argument: tenantId, from: this);

  @override
  String toString() => r'tenantActiveLeaseControllerProvider';
}

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) dont ce locataire est le
/// locataire principal, affiché dans sa fiche (`TenantDetailScreen`).

abstract class _$TenantActiveLeaseController
    extends $AsyncNotifier<TenantActiveLeaseState> {
  late final _$args = ref.$arg as String;
  String get tenantId => _$args;

  FutureOr<TenantActiveLeaseState> build(String tenantId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<TenantActiveLeaseState>, TenantActiveLeaseState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<TenantActiveLeaseState>,
                TenantActiveLeaseState
              >,
              AsyncValue<TenantActiveLeaseState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
