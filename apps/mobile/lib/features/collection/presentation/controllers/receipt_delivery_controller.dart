import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/network/api_exception.dart';
import '../../../documents/data/documents_providers.dart';
import '../../../documents/domain/entities/upload_url_result.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/collection_providers.dart';

part 'receipt_delivery_controller.g.dart';

enum ReceiptDeliveryStatus {
  idle,
  downloading,
  sharing,
  sending,
  success,
  error,
}

class ReceiptDeliveryState {
  const ReceiptDeliveryState({
    this.status = ReceiptDeliveryStatus.idle,
    this.file,
    this.errorMessage,
  });

  final ReceiptDeliveryStatus status;
  final File? file;
  final String? errorMessage;

  ReceiptDeliveryState copyWith({
    ReceiptDeliveryStatus? status,
    File? file,
    String? errorMessage,
  }) {
    return ReceiptDeliveryState(
      status: status ?? this.status,
      file: file ?? this.file,
      errorMessage: errorMessage,
    );
  }
}

/// Téléchargement/partage du PDF d'un reçu de caisse (`downloadUrl` signée)
/// et renvoi WhatsApp/SMS au locataire (`POST /cash-receipts/{id}/send`).
/// Un contrôleur par reçu (`cashReceiptId`).
@riverpod
class ReceiptDeliveryController extends _$ReceiptDeliveryController {
  @override
  ReceiptDeliveryState build(String cashReceiptId) =>
      const ReceiptDeliveryState();

  Future<void> shareReceiptPdf(String documentId) async {
    state = state.copyWith(status: ReceiptDeliveryStatus.downloading);
    try {
      final String organizationId =
          ref.read(selectedOrganizationControllerProvider).value ?? '';
      final DownloadUrlResult download = await ref
          .read(documentsRepositoryProvider)
          .fetchDownloadUrl(
            organizationId: organizationId,
            documentId: documentId,
          );
      final Directory tempDir = await getTemporaryDirectory();
      final String savePath = p.join(tempDir.path, 'recu_$cashReceiptId.pdf');
      await Dio().download(download.downloadUrl, savePath);
      final File file = File(savePath);
      state = state.copyWith(status: ReceiptDeliveryStatus.sharing, file: file);
      await SharePlus.instance.share(
        ShareParams(files: [XFile(file.path)], text: 'Reçu de caisse'),
      );
      state = state.copyWith(status: ReceiptDeliveryStatus.success);
    } on ApiException catch (e) {
      state = state.copyWith(
        status: ReceiptDeliveryStatus.error,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: ReceiptDeliveryStatus.error,
        errorMessage: 'Partage impossible : $e',
      );
    }
  }

  Future<void> resend() async {
    state = state.copyWith(status: ReceiptDeliveryStatus.sending);
    try {
      final String organizationId =
          ref.read(selectedOrganizationControllerProvider).value ?? '';
      await ref
          .read(collectionRepositoryProvider)
          .sendCashReceipt(
            organizationId: organizationId,
            cashReceiptId: cashReceiptId,
          );
      state = state.copyWith(status: ReceiptDeliveryStatus.success);
    } on ApiException catch (e) {
      state = state.copyWith(
        status: ReceiptDeliveryStatus.error,
        errorMessage: e.message,
      );
    }
  }
}
