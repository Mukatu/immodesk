import 'entities/inspection_condition.dart';
import 'entities/inspection_draft.dart';
import 'entities/inspection_item_draft.dart';

/// Résultat de la validation avant signature : soit prêt, soit un message
/// en français à afficher tel quel (`docs/api/phase8-contract.md`, arbitrage
/// 6 : « la signature est refusée sans elle, par 422
/// INSPECTIONS.PHOTO_REQUIRED »).
class InspectionSignReadiness {
  const InspectionSignReadiness({required this.canSign, this.message});

  final bool canSign;
  final String? message;

  static const InspectionSignReadiness ok = InspectionSignReadiness(
    canSign: true,
  );
}

/// Postes dont l'état constaté exige une photo mais qui n'en portent aucune.
List<InspectionItemDraft> itemsMissingRequiredPhoto(
  List<InspectionItemDraft> items,
) {
  return items.where((i) => !i.hasRequiredPhoto).toList();
}

/// Vérifie si un état des lieux peut être signé : au moins un poste saisi,
/// motif d'absence renseigné si le locataire est absent, et aucune photo
/// manquante sur un poste en mauvais état, dégradé ou manquant.
InspectionSignReadiness checkInspectionSignReadiness(InspectionDraft draft) {
  if (draft.items.isEmpty) {
    return const InspectionSignReadiness(
      canSign: false,
      message: 'Ajoutez au moins un poste avant de signer.',
    );
  }
  if (!draft.tenantPresent &&
      (draft.absenceReason == null || draft.absenceReason!.trim().isEmpty)) {
    return const InspectionSignReadiness(
      canSign: false,
      message:
          'Le locataire est absent : indiquez un motif avant de continuer.',
    );
  }
  final List<InspectionItemDraft> missing = itemsMissingRequiredPhoto(
    draft.items,
  );
  if (missing.isNotEmpty) {
    final String list = missing
        .map((i) => '${i.roomLabel} — ${i.elementLabel} (${i.condition.label})')
        .join(', ');
    return InspectionSignReadiness(
      canSign: false,
      message:
          'Photo obligatoire pour les postes en mauvais état, dégradé ou '
          'manquant : $list.',
    );
  }
  return InspectionSignReadiness.ok;
}
