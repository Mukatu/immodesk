import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/mandates_providers.dart';
import '../../domain/entities/mandate_detail.dart';

part 'mandate_detail_controller.g.dart';

@riverpod
class MandateDetailController extends _$MandateDetailController {
  @override
  Future<MandateDetail> build(String mandateId) async {
    final String organizationId =
        await ref.watch(selectedOrganizationControllerProvider.future) ?? '';
    return ref
        .watch(mandatesRepositoryProvider)
        .fetchMandateDetail(
          organizationId: organizationId,
          mandateId: mandateId,
        );
  }
}
