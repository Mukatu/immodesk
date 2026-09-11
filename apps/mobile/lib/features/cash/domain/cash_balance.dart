import 'entities/cash_receipt_status.dart';
import 'entities/cash_receipt_summary.dart';

/// Calcule l'encours détenu par le démarcheur à partir de ses reçus de
/// caisse : somme des reçus `ISSUED` (émis mais non encore remis ni
/// annulés), conformément à la règle du contrat de phase 3
/// (`GET /v1/cash/collectors/{userId}/balance`).
int computeHeldAmount(List<CashReceiptSummary> receipts) {
  return receipts
      .where((receipt) => receipt.status == CashReceiptStatus.issued)
      .fold<int>(0, (sum, receipt) => sum + receipt.amount);
}

/// Reçus non remis (encore en caisse), triés du plus ancien au plus
/// récent — c'est l'ordre attendu à l'écran « Ma caisse » (ancienneté).
List<CashReceiptSummary> unremittedReceiptsOldestFirst(
  List<CashReceiptSummary> receipts,
) {
  final List<CashReceiptSummary> unremitted = receipts
      .where((receipt) => receipt.status == CashReceiptStatus.issued)
      .toList();
  unremitted.sort((a, b) => a.receivedAt.compareTo(b.receivedAt));
  return unremitted;
}

/// Vrai si l'encours dépasse le plafond d'organisation. N'est jamais
/// bloquant côté API (`CASH.OVER_CAP` n'existe pas) : sert uniquement à
/// afficher une alerte visuelle.
bool isOverCap({required int heldAmount, required int capAmount}) {
  return heldAmount > capAmount;
}
