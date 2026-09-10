import 'dart:async';

/// Bus d'événements minimal permettant à l'intercepteur dio (couche réseau)
/// de signaler l'expiration de session à la couche présentation, sans
/// dépendance circulaire entre providers.
class AuthEventBus {
  final StreamController<void> _controller = StreamController<void>.broadcast();

  Stream<void> get onSessionExpired => _controller.stream;

  void notifySessionExpired() {
    if (!_controller.isClosed) {
      _controller.add(null);
    }
  }

  void dispose() {
    _controller.close();
  }
}
