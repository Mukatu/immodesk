// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mobile_config.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Charge `GET /v1/mobile/config`, avec repli sur la dernière valeur connue
/// (`AppSettings`) puis sur les valeurs par défaut du contrat si l'appareil
/// n'a jamais synchronisé.

@ProviderFor(mobileConfig)
final mobileConfigProvider = MobileConfigProvider._();

/// Charge `GET /v1/mobile/config`, avec repli sur la dernière valeur connue
/// (`AppSettings`) puis sur les valeurs par défaut du contrat si l'appareil
/// n'a jamais synchronisé.

final class MobileConfigProvider
    extends
        $FunctionalProvider<
          AsyncValue<MobileConfig>,
          MobileConfig,
          FutureOr<MobileConfig>
        >
    with $FutureModifier<MobileConfig>, $FutureProvider<MobileConfig> {
  /// Charge `GET /v1/mobile/config`, avec repli sur la dernière valeur connue
  /// (`AppSettings`) puis sur les valeurs par défaut du contrat si l'appareil
  /// n'a jamais synchronisé.
  MobileConfigProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'mobileConfigProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$mobileConfigHash();

  @$internal
  @override
  $FutureProviderElement<MobileConfig> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<MobileConfig> create(Ref ref) {
    return mobileConfig(ref);
  }
}

String _$mobileConfigHash() => r'f47f4c31b3cbf1bd95b97389ffcd18889d68ec77';
