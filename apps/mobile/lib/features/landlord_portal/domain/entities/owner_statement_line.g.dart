// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'owner_statement_line.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OwnerStatementLine _$OwnerStatementLineFromJson(Map<String, dynamic> json) =>
    _OwnerStatementLine(
      id: json['id'] as String,
      lineType: $enumDecode(_$OwnerStatementLineTypeEnumMap, json['lineType']),
      label: json['label'] as String,
      amount: (json['amount'] as num).toInt(),
      isDebit: json['isDebit'] as bool,
      position: (json['position'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$OwnerStatementLineToJson(_OwnerStatementLine instance) =>
    <String, dynamic>{
      'id': instance.id,
      'lineType': _$OwnerStatementLineTypeEnumMap[instance.lineType]!,
      'label': instance.label,
      'amount': instance.amount,
      'isDebit': instance.isDebit,
      'position': instance.position,
    };

const _$OwnerStatementLineTypeEnumMap = {
  OwnerStatementLineType.rentCollected: 'RENT_COLLECTED',
  OwnerStatementLineType.chargeCollected: 'CHARGE_COLLECTED',
  OwnerStatementLineType.commission: 'COMMISSION',
  OwnerStatementLineType.expense: 'EXPENSE',
  OwnerStatementLineType.vat: 'VAT',
  OwnerStatementLineType.depositHeld: 'DEPOSIT_HELD',
  OwnerStatementLineType.carryForward: 'CARRY_FORWARD',
  OwnerStatementLineType.adjustment: 'ADJUSTMENT',
  OwnerStatementLineType.other: 'OTHER',
};
