// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'commissions_list_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(CommissionsListController)
final commissionsListControllerProvider = CommissionsListControllerProvider._();

final class CommissionsListControllerProvider
    extends
        $AsyncNotifierProvider<
          CommissionsListController,
          CommissionsListState
        > {
  CommissionsListControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'commissionsListControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$commissionsListControllerHash();

  @$internal
  @override
  CommissionsListController create() => CommissionsListController();
}

String _$commissionsListControllerHash() =>
    r'1f27a073aaeefd294f767ad87d1507e941a495c8';

abstract class _$CommissionsListController
    extends $AsyncNotifier<CommissionsListState> {
  FutureOr<CommissionsListState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<CommissionsListState>, CommissionsListState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<CommissionsListState>,
                CommissionsListState
              >,
              AsyncValue<CommissionsListState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
