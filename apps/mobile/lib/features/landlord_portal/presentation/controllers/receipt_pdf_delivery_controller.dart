import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:share_plus/share_plus.dart';

import '../../../leases/data/lease_document_download_service.dart';
import 'statement_pdf_delivery_controller.dart';

part 'receipt_pdf_delivery_controller.g.dart';

/// Téléchargement puis partage du PDF d'une quittance
/// (`downloadUrl` déjà signée, embarquée dans `ReceiptSummary`).
@riverpod
class ReceiptPdfDeliveryController extends _$ReceiptPdfDeliveryController {
  @override
  StatementPdfState build(String receiptId) => const StatementPdfState();

  Future<void> downloadAndShare(String downloadUrl) async {
    state = state.copyWith(status: StatementPdfStatus.downloading);
    try {
      final Directory tempDir = await getTemporaryDirectory();
      final String savePath = p.join(tempDir.path, 'quittance_$receiptId.pdf');
      await ref.read(downloadDioProvider).download(downloadUrl, savePath);
      state = state.copyWith(status: StatementPdfStatus.sharing);
      await SharePlus.instance.share(
        ShareParams(files: [XFile(savePath)], text: 'Quittance de loyer'),
      );
      state = state.copyWith(status: StatementPdfStatus.success);
    } catch (e) {
      state = state.copyWith(
        status: StatementPdfStatus.error,
        errorMessage: 'Partage impossible : $e',
      );
    }
  }
}
