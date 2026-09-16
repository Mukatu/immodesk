import '../../domain/entities/maintenance_status.dart';

/// État de la saisie d'une mise à jour terrain pour une demande de
/// maintenance : commentaire, changement de statut, photo facultative.
class MaintenanceUpdateState {
  const MaintenanceUpdateState({
    required this.requestId,
    required this.clientRef,
    this.newStatus,
    this.message = '',
    this.photoPath,
    this.isSubmitting = false,
    this.errorMessage,
    this.success = false,
    this.queuedOffline = false,
  });

  final String requestId;
  final String clientRef;
  final MaintenanceStatus? newStatus;
  final String message;
  final String? photoPath;
  final bool isSubmitting;
  final String? errorMessage;
  final bool success;
  final bool queuedOffline;

  /// Au moins un changement de statut ou un commentaire est requis : une
  /// mise à jour vide n'a pas de valeur de traçabilité.
  bool get canSubmit =>
      !isSubmitting && (newStatus != null || message.trim().isNotEmpty);

  MaintenanceUpdateState copyWith({
    MaintenanceStatus? newStatus,
    String? message,
    String? photoPath,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    bool? success,
    bool? queuedOffline,
  }) {
    return MaintenanceUpdateState(
      requestId: requestId,
      clientRef: clientRef,
      newStatus: newStatus ?? this.newStatus,
      message: message ?? this.message,
      photoPath: photoPath ?? this.photoPath,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      success: success ?? this.success,
      queuedOffline: queuedOffline ?? this.queuedOffline,
    );
  }
}
