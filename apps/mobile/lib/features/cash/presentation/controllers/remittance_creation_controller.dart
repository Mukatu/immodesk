import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/ulid.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/cash_providers.dart';
import '../../domain/cash_balance.dart';
import '../../domain/entities/cash_receipt_summary.dart';
import '../../domain/entities/remittance_summary.dart';

part 'remittance_creation_controller.g.dart';

/// État de la création d'une remise : reçus non remis sélectionnables,
/// montant déclaré, coupures optionnelles.
class RemittanceCreationState {
  const RemittanceCreationState({
    this.receipts = const [],
    this.selectedReceiptIds = const {},
    this.declaredAmount = 0,
    required this.clientRef,
    this.denominations = const {},
    this.isSubmitting = false,
    this.errorMessage,
    this.result,
  });

  final List<CashReceiptSummary> receipts;
  final Set<String> selectedReceiptIds;
  final int declaredAmount;

  /// Généré une seule fois, conservé jusqu'à la réponse (idempotence par
  /// `clientRef`, même règle que l'encaissement).
  final String clientRef;

  final Map<String, int> denominations;
  final bool isSubmitting;
  final String? errorMessage;
  final RemittanceSummary? result;

  List<CashReceiptSummary> get selectedReceipts => receipts
      .where((receipt) => selectedReceiptIds.contains(receipt.id))
      .toList();

  int get expectedAmount =>
      selectedReceipts.fold<int>(0, (sum, r) => sum + r.amount);

  RemittanceCreationState copyWith({
    List<CashReceiptSummary>? receipts,
    Set<String>? selectedReceiptIds,
    int? declaredAmount,
    Map<String, int>? denominations,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    RemittanceSummary? result,
  }) {
    return RemittanceCreationState(
      receipts: receipts ?? this.receipts,
      selectedReceiptIds: selectedReceiptIds ?? this.selectedReceiptIds,
      declaredAmount: declaredAmount ?? this.declaredAmount,
      clientRef: clientRef,
      denominations: denominations ?? this.denominations,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      result: result ?? this.result,
    );
  }
}

@riverpod
class RemittanceCreationController extends _$RemittanceCreationController {
  @override
  Future<RemittanceCreationState> build() async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) {
      return RemittanceCreationState(clientRef: Ulid.generate());
    }

    final List<CashReceiptSummary> all = await ref
        .watch(cashRepositoryProvider)
        .fetchMyCashReceipts(organizationId);
    final List<CashReceiptSummary> unremitted = unremittedReceiptsOldestFirst(
      all,
    );
    final int total = unremitted.fold<int>(0, (sum, r) => sum + r.amount);

    return RemittanceCreationState(
      receipts: unremitted,
      selectedReceiptIds: unremitted.map((r) => r.id).toSet(),
      declaredAmount: total,
      clientRef: Ulid.generate(),
    );
  }

  void toggleReceipt(String receiptId) {
    final RemittanceCreationState? current = state.value;
    if (current == null) return;
    final Set<String> updated = {...current.selectedReceiptIds};
    if (!updated.add(receiptId)) {
      updated.remove(receiptId);
    }
    state = AsyncData(current.copyWith(selectedReceiptIds: updated));
  }

  void setDeclaredAmount(int amount) {
    final RemittanceCreationState? current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        declaredAmount: amount < 0 ? 0 : amount,
        clearError: true,
      ),
    );
  }

  void setDenomination(String noteValue, int count) {
    final RemittanceCreationState? current = state.value;
    if (current == null) return;
    final Map<String, int> updated = {...current.denominations};
    if (count <= 0) {
      updated.remove(noteValue);
    } else {
      updated[noteValue] = count;
    }
    state = AsyncData(current.copyWith(denominations: updated));
  }

  Future<void> submit() async {
    final RemittanceCreationState? current = state.value;
    if (current == null || current.isSubmitting) return;
    if (current.selectedReceiptIds.isEmpty) return;
    state = AsyncData(current.copyWith(isSubmitting: true, clearError: true));

    final String? organizationId = ref
        .read(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) {
      state = AsyncData(
        current.copyWith(
          isSubmitting: false,
          errorMessage: 'Organisation introuvable.',
        ),
      );
      return;
    }

    try {
      final RemittanceSummary result = await ref
          .read(cashRepositoryProvider)
          .createRemittance(
            organizationId: organizationId,
            cashReceiptIds: current.selectedReceiptIds.toList(),
            declaredAmount: current.declaredAmount,
            denominations: current.denominations.isEmpty
                ? null
                : current.denominations,
            clientRef: current.clientRef,
          );
      state = AsyncData(current.copyWith(isSubmitting: false, result: result));
    } on ApiException catch (e) {
      state = AsyncData(
        current.copyWith(isSubmitting: false, errorMessage: e.message),
      );
    }
  }
}
