import 'dart:async';

import '../../domain/entities/momo_transaction.dart';
import 'momo_aggregator_state.dart';

/// Interrogation périodique du statut d'une transaction agrégateur en
/// attente (`docs/api/phase4-contract.md` : toutes les 3 secondes, jamais
/// de confirmation sur la seule foi d'un webhook). Isolé du contrôleur
/// Riverpod pour rester une classe Dart simple, testable seule et facile à
/// disposer (un cycle = un décompte de [pollInterval] secondes puis un
/// appel à [fetchStatus]).
class MomoPollingCoordinator {
  MomoPollingCoordinator({
    required this.pollInterval,
    required this.fetchStatus,
    required this.onUpdate,
    required this.onTick,
  });

  final Duration pollInterval;
  final Future<MomoTransaction> Function() fetchStatus;
  final void Function(MomoTransaction transaction, MomoAggregatorPhase phase)
  onUpdate;
  final void Function(int secondsRemaining) onTick;

  Timer? _pollTimer;
  Timer? _tickTimer;
  int _secondsRemaining = 0;

  void start() {
    _secondsRemaining = pollInterval.inSeconds;
    onTick(_secondsRemaining);
    _pollTimer?.cancel();
    _pollTimer = Timer(pollInterval, _poll);
    _tickTimer?.cancel();
    _tickTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsRemaining > 0) _secondsRemaining -= 1;
      onTick(_secondsRemaining);
    });
  }

  Future<void> _poll() async {
    try {
      final MomoTransaction transaction = await fetchStatus();
      final MomoAggregatorPhase phase = phaseForTransaction(transaction);
      onUpdate(transaction, phase);
      if (phase == MomoAggregatorPhase.waiting) {
        start();
      } else {
        dispose();
      }
    } catch (_) {
      // Panne réseau ponctuelle pendant l'attente : nouvelle tentative
      // après le même délai (le job serveur `momo:reconcile-pending` reste
      // la source de vérité en cas d'indisponibilité prolongée).
      start();
    }
  }

  void dispose() {
    _pollTimer?.cancel();
    _tickTimer?.cancel();
  }
}
