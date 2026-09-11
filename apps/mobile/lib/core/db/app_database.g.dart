// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $AppSettingsTable extends AppSettings
    with TableInfo<$AppSettingsTable, AppSettingRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $AppSettingsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'app_settings';
  @override
  VerificationContext validateIntegrity(
    Insertable<AppSettingRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
        _keyMeta,
        key.isAcceptableOrUnknown(data['key']!, _keyMeta),
      );
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
        _valueMeta,
        value.isAcceptableOrUnknown(data['value']!, _valueMeta),
      );
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  AppSettingRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return AppSettingRow(
      key: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}key'],
      )!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}value'],
      )!,
    );
  }

  @override
  $AppSettingsTable createAlias(String alias) {
    return $AppSettingsTable(attachedDatabase, alias);
  }
}

class AppSettingRow extends DataClass implements Insertable<AppSettingRow> {
  final String key;
  final String value;
  const AppSettingRow({required this.key, required this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  AppSettingsCompanion toCompanion(bool nullToAbsent) {
    return AppSettingsCompanion(key: Value(key), value: Value(value));
  }

  factory AppSettingRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return AppSettingRow(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
    };
  }

  AppSettingRow copyWith({String? key, String? value}) =>
      AppSettingRow(key: key ?? this.key, value: value ?? this.value);
  AppSettingRow copyWithCompanion(AppSettingsCompanion data) {
    return AppSettingRow(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('AppSettingRow(')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is AppSettingRow &&
          other.key == this.key &&
          other.value == this.value);
}

class AppSettingsCompanion extends UpdateCompanion<AppSettingRow> {
  final Value<String> key;
  final Value<String> value;
  final Value<int> rowid;
  const AppSettingsCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  AppSettingsCompanion.insert({
    required String key,
    required String value,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       value = Value(value);
  static Insertable<AppSettingRow> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  AppSettingsCompanion copyWith({
    Value<String>? key,
    Value<String>? value,
    Value<int>? rowid,
  }) {
    return AppSettingsCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('AppSettingsCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OutboxTable extends Outbox with TableInfo<$OutboxTable, OutboxRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OutboxTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _clientRefMeta = const VerificationMeta(
    'clientRef',
  );
  @override
  late final GeneratedColumn<String> clientRef = GeneratedColumn<String>(
    'client_ref',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _organizationIdMeta = const VerificationMeta(
    'organizationId',
  );
  @override
  late final GeneratedColumn<String> organizationId = GeneratedColumn<String>(
    'organization_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _operationMeta = const VerificationMeta(
    'operation',
  );
  @override
  late final GeneratedColumn<String> operation = GeneratedColumn<String>(
    'operation',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dependsOnClientRefMeta =
      const VerificationMeta('dependsOnClientRef');
  @override
  late final GeneratedColumn<String> dependsOnClientRef =
      GeneratedColumn<String>(
        'depends_on_client_ref',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _attemptCountMeta = const VerificationMeta(
    'attemptCount',
  );
  @override
  late final GeneratedColumn<int> attemptCount = GeneratedColumn<int>(
    'attempt_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('PENDING'),
  );
  static const VerificationMeta _lastErrorCodeMeta = const VerificationMeta(
    'lastErrorCode',
  );
  @override
  late final GeneratedColumn<String> lastErrorCode = GeneratedColumn<String>(
    'last_error_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  static const VerificationMeta _nextAttemptAtMeta = const VerificationMeta(
    'nextAttemptAt',
  );
  @override
  late final GeneratedColumn<DateTime> nextAttemptAt =
      GeneratedColumn<DateTime>(
        'next_attempt_at',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
        defaultValue: currentDateAndTime,
      );
  @override
  List<GeneratedColumn> get $columns => [
    clientRef,
    organizationId,
    operation,
    payload,
    dependsOnClientRef,
    attemptCount,
    status,
    lastErrorCode,
    createdAt,
    nextAttemptAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'outbox';
  @override
  VerificationContext validateIntegrity(
    Insertable<OutboxRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('client_ref')) {
      context.handle(
        _clientRefMeta,
        clientRef.isAcceptableOrUnknown(data['client_ref']!, _clientRefMeta),
      );
    } else if (isInserting) {
      context.missing(_clientRefMeta);
    }
    if (data.containsKey('organization_id')) {
      context.handle(
        _organizationIdMeta,
        organizationId.isAcceptableOrUnknown(
          data['organization_id']!,
          _organizationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_organizationIdMeta);
    }
    if (data.containsKey('operation')) {
      context.handle(
        _operationMeta,
        operation.isAcceptableOrUnknown(data['operation']!, _operationMeta),
      );
    } else if (isInserting) {
      context.missing(_operationMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('depends_on_client_ref')) {
      context.handle(
        _dependsOnClientRefMeta,
        dependsOnClientRef.isAcceptableOrUnknown(
          data['depends_on_client_ref']!,
          _dependsOnClientRefMeta,
        ),
      );
    }
    if (data.containsKey('attempt_count')) {
      context.handle(
        _attemptCountMeta,
        attemptCount.isAcceptableOrUnknown(
          data['attempt_count']!,
          _attemptCountMeta,
        ),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('last_error_code')) {
      context.handle(
        _lastErrorCodeMeta,
        lastErrorCode.isAcceptableOrUnknown(
          data['last_error_code']!,
          _lastErrorCodeMeta,
        ),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    if (data.containsKey('next_attempt_at')) {
      context.handle(
        _nextAttemptAtMeta,
        nextAttemptAt.isAcceptableOrUnknown(
          data['next_attempt_at']!,
          _nextAttemptAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {clientRef};
  @override
  OutboxRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OutboxRow(
      clientRef: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}client_ref'],
      )!,
      organizationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}organization_id'],
      )!,
      operation: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operation'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      dependsOnClientRef: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}depends_on_client_ref'],
      ),
      attemptCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}attempt_count'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      lastErrorCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_error_code'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      nextAttemptAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}next_attempt_at'],
      )!,
    );
  }

  @override
  $OutboxTable createAlias(String alias) {
    return $OutboxTable(attachedDatabase, alias);
  }
}

class OutboxRow extends DataClass implements Insertable<OutboxRow> {
  /// ULID généré sur l'appareil : clé d'idempotence côté API.
  final String clientRef;
  final String organizationId;

  /// Ex. `cash_receipt.create`, `remittance.close`…
  final String operation;

  /// JSON canonique de la commande à rejouer.
  final String payload;

  /// Ordre de rejeu : ULID de l'opération dont celle-ci dépend.
  final String? dependsOnClientRef;
  final int attemptCount;

  /// PENDING, SENDING, ACKED, REJECTED.
  final String status;
  final String? lastErrorCode;
  final DateTime createdAt;
  final DateTime nextAttemptAt;
  const OutboxRow({
    required this.clientRef,
    required this.organizationId,
    required this.operation,
    required this.payload,
    this.dependsOnClientRef,
    required this.attemptCount,
    required this.status,
    this.lastErrorCode,
    required this.createdAt,
    required this.nextAttemptAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['client_ref'] = Variable<String>(clientRef);
    map['organization_id'] = Variable<String>(organizationId);
    map['operation'] = Variable<String>(operation);
    map['payload'] = Variable<String>(payload);
    if (!nullToAbsent || dependsOnClientRef != null) {
      map['depends_on_client_ref'] = Variable<String>(dependsOnClientRef);
    }
    map['attempt_count'] = Variable<int>(attemptCount);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || lastErrorCode != null) {
      map['last_error_code'] = Variable<String>(lastErrorCode);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['next_attempt_at'] = Variable<DateTime>(nextAttemptAt);
    return map;
  }

  OutboxCompanion toCompanion(bool nullToAbsent) {
    return OutboxCompanion(
      clientRef: Value(clientRef),
      organizationId: Value(organizationId),
      operation: Value(operation),
      payload: Value(payload),
      dependsOnClientRef: dependsOnClientRef == null && nullToAbsent
          ? const Value.absent()
          : Value(dependsOnClientRef),
      attemptCount: Value(attemptCount),
      status: Value(status),
      lastErrorCode: lastErrorCode == null && nullToAbsent
          ? const Value.absent()
          : Value(lastErrorCode),
      createdAt: Value(createdAt),
      nextAttemptAt: Value(nextAttemptAt),
    );
  }

  factory OutboxRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OutboxRow(
      clientRef: serializer.fromJson<String>(json['clientRef']),
      organizationId: serializer.fromJson<String>(json['organizationId']),
      operation: serializer.fromJson<String>(json['operation']),
      payload: serializer.fromJson<String>(json['payload']),
      dependsOnClientRef: serializer.fromJson<String?>(
        json['dependsOnClientRef'],
      ),
      attemptCount: serializer.fromJson<int>(json['attemptCount']),
      status: serializer.fromJson<String>(json['status']),
      lastErrorCode: serializer.fromJson<String?>(json['lastErrorCode']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      nextAttemptAt: serializer.fromJson<DateTime>(json['nextAttemptAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'clientRef': serializer.toJson<String>(clientRef),
      'organizationId': serializer.toJson<String>(organizationId),
      'operation': serializer.toJson<String>(operation),
      'payload': serializer.toJson<String>(payload),
      'dependsOnClientRef': serializer.toJson<String?>(dependsOnClientRef),
      'attemptCount': serializer.toJson<int>(attemptCount),
      'status': serializer.toJson<String>(status),
      'lastErrorCode': serializer.toJson<String?>(lastErrorCode),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'nextAttemptAt': serializer.toJson<DateTime>(nextAttemptAt),
    };
  }

  OutboxRow copyWith({
    String? clientRef,
    String? organizationId,
    String? operation,
    String? payload,
    Value<String?> dependsOnClientRef = const Value.absent(),
    int? attemptCount,
    String? status,
    Value<String?> lastErrorCode = const Value.absent(),
    DateTime? createdAt,
    DateTime? nextAttemptAt,
  }) => OutboxRow(
    clientRef: clientRef ?? this.clientRef,
    organizationId: organizationId ?? this.organizationId,
    operation: operation ?? this.operation,
    payload: payload ?? this.payload,
    dependsOnClientRef: dependsOnClientRef.present
        ? dependsOnClientRef.value
        : this.dependsOnClientRef,
    attemptCount: attemptCount ?? this.attemptCount,
    status: status ?? this.status,
    lastErrorCode: lastErrorCode.present
        ? lastErrorCode.value
        : this.lastErrorCode,
    createdAt: createdAt ?? this.createdAt,
    nextAttemptAt: nextAttemptAt ?? this.nextAttemptAt,
  );
  OutboxRow copyWithCompanion(OutboxCompanion data) {
    return OutboxRow(
      clientRef: data.clientRef.present ? data.clientRef.value : this.clientRef,
      organizationId: data.organizationId.present
          ? data.organizationId.value
          : this.organizationId,
      operation: data.operation.present ? data.operation.value : this.operation,
      payload: data.payload.present ? data.payload.value : this.payload,
      dependsOnClientRef: data.dependsOnClientRef.present
          ? data.dependsOnClientRef.value
          : this.dependsOnClientRef,
      attemptCount: data.attemptCount.present
          ? data.attemptCount.value
          : this.attemptCount,
      status: data.status.present ? data.status.value : this.status,
      lastErrorCode: data.lastErrorCode.present
          ? data.lastErrorCode.value
          : this.lastErrorCode,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      nextAttemptAt: data.nextAttemptAt.present
          ? data.nextAttemptAt.value
          : this.nextAttemptAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OutboxRow(')
          ..write('clientRef: $clientRef, ')
          ..write('organizationId: $organizationId, ')
          ..write('operation: $operation, ')
          ..write('payload: $payload, ')
          ..write('dependsOnClientRef: $dependsOnClientRef, ')
          ..write('attemptCount: $attemptCount, ')
          ..write('status: $status, ')
          ..write('lastErrorCode: $lastErrorCode, ')
          ..write('createdAt: $createdAt, ')
          ..write('nextAttemptAt: $nextAttemptAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    clientRef,
    organizationId,
    operation,
    payload,
    dependsOnClientRef,
    attemptCount,
    status,
    lastErrorCode,
    createdAt,
    nextAttemptAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OutboxRow &&
          other.clientRef == this.clientRef &&
          other.organizationId == this.organizationId &&
          other.operation == this.operation &&
          other.payload == this.payload &&
          other.dependsOnClientRef == this.dependsOnClientRef &&
          other.attemptCount == this.attemptCount &&
          other.status == this.status &&
          other.lastErrorCode == this.lastErrorCode &&
          other.createdAt == this.createdAt &&
          other.nextAttemptAt == this.nextAttemptAt);
}

class OutboxCompanion extends UpdateCompanion<OutboxRow> {
  final Value<String> clientRef;
  final Value<String> organizationId;
  final Value<String> operation;
  final Value<String> payload;
  final Value<String?> dependsOnClientRef;
  final Value<int> attemptCount;
  final Value<String> status;
  final Value<String?> lastErrorCode;
  final Value<DateTime> createdAt;
  final Value<DateTime> nextAttemptAt;
  final Value<int> rowid;
  const OutboxCompanion({
    this.clientRef = const Value.absent(),
    this.organizationId = const Value.absent(),
    this.operation = const Value.absent(),
    this.payload = const Value.absent(),
    this.dependsOnClientRef = const Value.absent(),
    this.attemptCount = const Value.absent(),
    this.status = const Value.absent(),
    this.lastErrorCode = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.nextAttemptAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OutboxCompanion.insert({
    required String clientRef,
    required String organizationId,
    required String operation,
    required String payload,
    this.dependsOnClientRef = const Value.absent(),
    this.attemptCount = const Value.absent(),
    this.status = const Value.absent(),
    this.lastErrorCode = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.nextAttemptAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : clientRef = Value(clientRef),
       organizationId = Value(organizationId),
       operation = Value(operation),
       payload = Value(payload);
  static Insertable<OutboxRow> custom({
    Expression<String>? clientRef,
    Expression<String>? organizationId,
    Expression<String>? operation,
    Expression<String>? payload,
    Expression<String>? dependsOnClientRef,
    Expression<int>? attemptCount,
    Expression<String>? status,
    Expression<String>? lastErrorCode,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? nextAttemptAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (clientRef != null) 'client_ref': clientRef,
      if (organizationId != null) 'organization_id': organizationId,
      if (operation != null) 'operation': operation,
      if (payload != null) 'payload': payload,
      if (dependsOnClientRef != null)
        'depends_on_client_ref': dependsOnClientRef,
      if (attemptCount != null) 'attempt_count': attemptCount,
      if (status != null) 'status': status,
      if (lastErrorCode != null) 'last_error_code': lastErrorCode,
      if (createdAt != null) 'created_at': createdAt,
      if (nextAttemptAt != null) 'next_attempt_at': nextAttemptAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OutboxCompanion copyWith({
    Value<String>? clientRef,
    Value<String>? organizationId,
    Value<String>? operation,
    Value<String>? payload,
    Value<String?>? dependsOnClientRef,
    Value<int>? attemptCount,
    Value<String>? status,
    Value<String?>? lastErrorCode,
    Value<DateTime>? createdAt,
    Value<DateTime>? nextAttemptAt,
    Value<int>? rowid,
  }) {
    return OutboxCompanion(
      clientRef: clientRef ?? this.clientRef,
      organizationId: organizationId ?? this.organizationId,
      operation: operation ?? this.operation,
      payload: payload ?? this.payload,
      dependsOnClientRef: dependsOnClientRef ?? this.dependsOnClientRef,
      attemptCount: attemptCount ?? this.attemptCount,
      status: status ?? this.status,
      lastErrorCode: lastErrorCode ?? this.lastErrorCode,
      createdAt: createdAt ?? this.createdAt,
      nextAttemptAt: nextAttemptAt ?? this.nextAttemptAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (clientRef.present) {
      map['client_ref'] = Variable<String>(clientRef.value);
    }
    if (organizationId.present) {
      map['organization_id'] = Variable<String>(organizationId.value);
    }
    if (operation.present) {
      map['operation'] = Variable<String>(operation.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (dependsOnClientRef.present) {
      map['depends_on_client_ref'] = Variable<String>(dependsOnClientRef.value);
    }
    if (attemptCount.present) {
      map['attempt_count'] = Variable<int>(attemptCount.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (lastErrorCode.present) {
      map['last_error_code'] = Variable<String>(lastErrorCode.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (nextAttemptAt.present) {
      map['next_attempt_at'] = Variable<DateTime>(nextAttemptAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OutboxCompanion(')
          ..write('clientRef: $clientRef, ')
          ..write('organizationId: $organizationId, ')
          ..write('operation: $operation, ')
          ..write('payload: $payload, ')
          ..write('dependsOnClientRef: $dependsOnClientRef, ')
          ..write('attemptCount: $attemptCount, ')
          ..write('status: $status, ')
          ..write('lastErrorCode: $lastErrorCode, ')
          ..write('createdAt: $createdAt, ')
          ..write('nextAttemptAt: $nextAttemptAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedPropertiesTable extends CachedProperties
    with TableInfo<$CachedPropertiesTable, CachedPropertyRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedPropertiesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _organizationIdMeta = const VerificationMeta(
    'organizationId',
  );
  @override
  late final GeneratedColumn<String> organizationId = GeneratedColumn<String>(
    'organization_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cityMeta = const VerificationMeta('city');
  @override
  late final GeneratedColumn<String> city = GeneratedColumn<String>(
    'city',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    organizationId,
    name,
    city,
    payload,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_properties';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedPropertyRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('organization_id')) {
      context.handle(
        _organizationIdMeta,
        organizationId.isAcceptableOrUnknown(
          data['organization_id']!,
          _organizationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_organizationIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('city')) {
      context.handle(
        _cityMeta,
        city.isAcceptableOrUnknown(data['city']!, _cityMeta),
      );
    } else if (isInserting) {
      context.missing(_cityMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedPropertyRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedPropertyRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      organizationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}organization_id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      city: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}city'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedPropertiesTable createAlias(String alias) {
    return $CachedPropertiesTable(attachedDatabase, alias);
  }
}

class CachedPropertyRow extends DataClass
    implements Insertable<CachedPropertyRow> {
  final String id;
  final String organizationId;
  final String name;
  final String city;

  /// JSON complet de `PropertySummary`.
  final String payload;
  final DateTime cachedAt;
  const CachedPropertyRow({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.city,
    required this.payload,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['organization_id'] = Variable<String>(organizationId);
    map['name'] = Variable<String>(name);
    map['city'] = Variable<String>(city);
    map['payload'] = Variable<String>(payload);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedPropertiesCompanion toCompanion(bool nullToAbsent) {
    return CachedPropertiesCompanion(
      id: Value(id),
      organizationId: Value(organizationId),
      name: Value(name),
      city: Value(city),
      payload: Value(payload),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedPropertyRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedPropertyRow(
      id: serializer.fromJson<String>(json['id']),
      organizationId: serializer.fromJson<String>(json['organizationId']),
      name: serializer.fromJson<String>(json['name']),
      city: serializer.fromJson<String>(json['city']),
      payload: serializer.fromJson<String>(json['payload']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'organizationId': serializer.toJson<String>(organizationId),
      'name': serializer.toJson<String>(name),
      'city': serializer.toJson<String>(city),
      'payload': serializer.toJson<String>(payload),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedPropertyRow copyWith({
    String? id,
    String? organizationId,
    String? name,
    String? city,
    String? payload,
    DateTime? cachedAt,
  }) => CachedPropertyRow(
    id: id ?? this.id,
    organizationId: organizationId ?? this.organizationId,
    name: name ?? this.name,
    city: city ?? this.city,
    payload: payload ?? this.payload,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedPropertyRow copyWithCompanion(CachedPropertiesCompanion data) {
    return CachedPropertyRow(
      id: data.id.present ? data.id.value : this.id,
      organizationId: data.organizationId.present
          ? data.organizationId.value
          : this.organizationId,
      name: data.name.present ? data.name.value : this.name,
      city: data.city.present ? data.city.value : this.city,
      payload: data.payload.present ? data.payload.value : this.payload,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedPropertyRow(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('name: $name, ')
          ..write('city: $city, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, organizationId, name, city, payload, cachedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedPropertyRow &&
          other.id == this.id &&
          other.organizationId == this.organizationId &&
          other.name == this.name &&
          other.city == this.city &&
          other.payload == this.payload &&
          other.cachedAt == this.cachedAt);
}

class CachedPropertiesCompanion extends UpdateCompanion<CachedPropertyRow> {
  final Value<String> id;
  final Value<String> organizationId;
  final Value<String> name;
  final Value<String> city;
  final Value<String> payload;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedPropertiesCompanion({
    this.id = const Value.absent(),
    this.organizationId = const Value.absent(),
    this.name = const Value.absent(),
    this.city = const Value.absent(),
    this.payload = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedPropertiesCompanion.insert({
    required String id,
    required String organizationId,
    required String name,
    required String city,
    required String payload,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       organizationId = Value(organizationId),
       name = Value(name),
       city = Value(city),
       payload = Value(payload);
  static Insertable<CachedPropertyRow> custom({
    Expression<String>? id,
    Expression<String>? organizationId,
    Expression<String>? name,
    Expression<String>? city,
    Expression<String>? payload,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (organizationId != null) 'organization_id': organizationId,
      if (name != null) 'name': name,
      if (city != null) 'city': city,
      if (payload != null) 'payload': payload,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedPropertiesCompanion copyWith({
    Value<String>? id,
    Value<String>? organizationId,
    Value<String>? name,
    Value<String>? city,
    Value<String>? payload,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedPropertiesCompanion(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      name: name ?? this.name,
      city: city ?? this.city,
      payload: payload ?? this.payload,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (organizationId.present) {
      map['organization_id'] = Variable<String>(organizationId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (city.present) {
      map['city'] = Variable<String>(city.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedPropertiesCompanion(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('name: $name, ')
          ..write('city: $city, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedUnitsTable extends CachedUnits
    with TableInfo<$CachedUnitsTable, CachedUnitRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedUnitsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _organizationIdMeta = const VerificationMeta(
    'organizationId',
  );
  @override
  late final GeneratedColumn<String> organizationId = GeneratedColumn<String>(
    'organization_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _propertyIdMeta = const VerificationMeta(
    'propertyId',
  );
  @override
  late final GeneratedColumn<String> propertyId = GeneratedColumn<String>(
    'property_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    organizationId,
    propertyId,
    payload,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_units';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedUnitRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('organization_id')) {
      context.handle(
        _organizationIdMeta,
        organizationId.isAcceptableOrUnknown(
          data['organization_id']!,
          _organizationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_organizationIdMeta);
    }
    if (data.containsKey('property_id')) {
      context.handle(
        _propertyIdMeta,
        propertyId.isAcceptableOrUnknown(data['property_id']!, _propertyIdMeta),
      );
    } else if (isInserting) {
      context.missing(_propertyIdMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedUnitRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedUnitRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      organizationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}organization_id'],
      )!,
      propertyId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}property_id'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedUnitsTable createAlias(String alias) {
    return $CachedUnitsTable(attachedDatabase, alias);
  }
}

class CachedUnitRow extends DataClass implements Insertable<CachedUnitRow> {
  final String id;
  final String organizationId;
  final String propertyId;

  /// JSON de `Unit` (caractéristiques + loyer de référence).
  final String payload;
  final DateTime cachedAt;
  const CachedUnitRow({
    required this.id,
    required this.organizationId,
    required this.propertyId,
    required this.payload,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['organization_id'] = Variable<String>(organizationId);
    map['property_id'] = Variable<String>(propertyId);
    map['payload'] = Variable<String>(payload);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedUnitsCompanion toCompanion(bool nullToAbsent) {
    return CachedUnitsCompanion(
      id: Value(id),
      organizationId: Value(organizationId),
      propertyId: Value(propertyId),
      payload: Value(payload),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedUnitRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedUnitRow(
      id: serializer.fromJson<String>(json['id']),
      organizationId: serializer.fromJson<String>(json['organizationId']),
      propertyId: serializer.fromJson<String>(json['propertyId']),
      payload: serializer.fromJson<String>(json['payload']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'organizationId': serializer.toJson<String>(organizationId),
      'propertyId': serializer.toJson<String>(propertyId),
      'payload': serializer.toJson<String>(payload),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedUnitRow copyWith({
    String? id,
    String? organizationId,
    String? propertyId,
    String? payload,
    DateTime? cachedAt,
  }) => CachedUnitRow(
    id: id ?? this.id,
    organizationId: organizationId ?? this.organizationId,
    propertyId: propertyId ?? this.propertyId,
    payload: payload ?? this.payload,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedUnitRow copyWithCompanion(CachedUnitsCompanion data) {
    return CachedUnitRow(
      id: data.id.present ? data.id.value : this.id,
      organizationId: data.organizationId.present
          ? data.organizationId.value
          : this.organizationId,
      propertyId: data.propertyId.present
          ? data.propertyId.value
          : this.propertyId,
      payload: data.payload.present ? data.payload.value : this.payload,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedUnitRow(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('propertyId: $propertyId, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, organizationId, propertyId, payload, cachedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedUnitRow &&
          other.id == this.id &&
          other.organizationId == this.organizationId &&
          other.propertyId == this.propertyId &&
          other.payload == this.payload &&
          other.cachedAt == this.cachedAt);
}

class CachedUnitsCompanion extends UpdateCompanion<CachedUnitRow> {
  final Value<String> id;
  final Value<String> organizationId;
  final Value<String> propertyId;
  final Value<String> payload;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedUnitsCompanion({
    this.id = const Value.absent(),
    this.organizationId = const Value.absent(),
    this.propertyId = const Value.absent(),
    this.payload = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedUnitsCompanion.insert({
    required String id,
    required String organizationId,
    required String propertyId,
    required String payload,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       organizationId = Value(organizationId),
       propertyId = Value(propertyId),
       payload = Value(payload);
  static Insertable<CachedUnitRow> custom({
    Expression<String>? id,
    Expression<String>? organizationId,
    Expression<String>? propertyId,
    Expression<String>? payload,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (organizationId != null) 'organization_id': organizationId,
      if (propertyId != null) 'property_id': propertyId,
      if (payload != null) 'payload': payload,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedUnitsCompanion copyWith({
    Value<String>? id,
    Value<String>? organizationId,
    Value<String>? propertyId,
    Value<String>? payload,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedUnitsCompanion(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      propertyId: propertyId ?? this.propertyId,
      payload: payload ?? this.payload,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (organizationId.present) {
      map['organization_id'] = Variable<String>(organizationId.value);
    }
    if (propertyId.present) {
      map['property_id'] = Variable<String>(propertyId.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedUnitsCompanion(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('propertyId: $propertyId, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedTenantsTable extends CachedTenants
    with TableInfo<$CachedTenantsTable, CachedTenantRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedTenantsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _organizationIdMeta = const VerificationMeta(
    'organizationId',
  );
  @override
  late final GeneratedColumn<String> organizationId = GeneratedColumn<String>(
    'organization_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _displayNameMeta = const VerificationMeta(
    'displayName',
  );
  @override
  late final GeneratedColumn<String> displayName = GeneratedColumn<String>(
    'display_name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
    'phone',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _normalizedSearchTextMeta =
      const VerificationMeta('normalizedSearchText');
  @override
  late final GeneratedColumn<String> normalizedSearchText =
      GeneratedColumn<String>(
        'normalized_search_text',
        aliasedName,
        false,
        type: DriftSqlType.string,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    organizationId,
    displayName,
    phone,
    normalizedSearchText,
    payload,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_tenants';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedTenantRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('organization_id')) {
      context.handle(
        _organizationIdMeta,
        organizationId.isAcceptableOrUnknown(
          data['organization_id']!,
          _organizationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_organizationIdMeta);
    }
    if (data.containsKey('display_name')) {
      context.handle(
        _displayNameMeta,
        displayName.isAcceptableOrUnknown(
          data['display_name']!,
          _displayNameMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_displayNameMeta);
    }
    if (data.containsKey('phone')) {
      context.handle(
        _phoneMeta,
        phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta),
      );
    } else if (isInserting) {
      context.missing(_phoneMeta);
    }
    if (data.containsKey('normalized_search_text')) {
      context.handle(
        _normalizedSearchTextMeta,
        normalizedSearchText.isAcceptableOrUnknown(
          data['normalized_search_text']!,
          _normalizedSearchTextMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_normalizedSearchTextMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedTenantRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedTenantRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      organizationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}organization_id'],
      )!,
      displayName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}display_name'],
      )!,
      phone: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}phone'],
      )!,
      normalizedSearchText: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}normalized_search_text'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedTenantsTable createAlias(String alias) {
    return $CachedTenantsTable(attachedDatabase, alias);
  }
}

class CachedTenantRow extends DataClass implements Insertable<CachedTenantRow> {
  final String id;
  final String organizationId;
  final String displayName;
  final String phone;
  final String normalizedSearchText;

  /// JSON de `Tenant`.
  final String payload;
  final DateTime cachedAt;
  const CachedTenantRow({
    required this.id,
    required this.organizationId,
    required this.displayName,
    required this.phone,
    required this.normalizedSearchText,
    required this.payload,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['organization_id'] = Variable<String>(organizationId);
    map['display_name'] = Variable<String>(displayName);
    map['phone'] = Variable<String>(phone);
    map['normalized_search_text'] = Variable<String>(normalizedSearchText);
    map['payload'] = Variable<String>(payload);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedTenantsCompanion toCompanion(bool nullToAbsent) {
    return CachedTenantsCompanion(
      id: Value(id),
      organizationId: Value(organizationId),
      displayName: Value(displayName),
      phone: Value(phone),
      normalizedSearchText: Value(normalizedSearchText),
      payload: Value(payload),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedTenantRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedTenantRow(
      id: serializer.fromJson<String>(json['id']),
      organizationId: serializer.fromJson<String>(json['organizationId']),
      displayName: serializer.fromJson<String>(json['displayName']),
      phone: serializer.fromJson<String>(json['phone']),
      normalizedSearchText: serializer.fromJson<String>(
        json['normalizedSearchText'],
      ),
      payload: serializer.fromJson<String>(json['payload']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'organizationId': serializer.toJson<String>(organizationId),
      'displayName': serializer.toJson<String>(displayName),
      'phone': serializer.toJson<String>(phone),
      'normalizedSearchText': serializer.toJson<String>(normalizedSearchText),
      'payload': serializer.toJson<String>(payload),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedTenantRow copyWith({
    String? id,
    String? organizationId,
    String? displayName,
    String? phone,
    String? normalizedSearchText,
    String? payload,
    DateTime? cachedAt,
  }) => CachedTenantRow(
    id: id ?? this.id,
    organizationId: organizationId ?? this.organizationId,
    displayName: displayName ?? this.displayName,
    phone: phone ?? this.phone,
    normalizedSearchText: normalizedSearchText ?? this.normalizedSearchText,
    payload: payload ?? this.payload,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedTenantRow copyWithCompanion(CachedTenantsCompanion data) {
    return CachedTenantRow(
      id: data.id.present ? data.id.value : this.id,
      organizationId: data.organizationId.present
          ? data.organizationId.value
          : this.organizationId,
      displayName: data.displayName.present
          ? data.displayName.value
          : this.displayName,
      phone: data.phone.present ? data.phone.value : this.phone,
      normalizedSearchText: data.normalizedSearchText.present
          ? data.normalizedSearchText.value
          : this.normalizedSearchText,
      payload: data.payload.present ? data.payload.value : this.payload,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedTenantRow(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('displayName: $displayName, ')
          ..write('phone: $phone, ')
          ..write('normalizedSearchText: $normalizedSearchText, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    organizationId,
    displayName,
    phone,
    normalizedSearchText,
    payload,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedTenantRow &&
          other.id == this.id &&
          other.organizationId == this.organizationId &&
          other.displayName == this.displayName &&
          other.phone == this.phone &&
          other.normalizedSearchText == this.normalizedSearchText &&
          other.payload == this.payload &&
          other.cachedAt == this.cachedAt);
}

class CachedTenantsCompanion extends UpdateCompanion<CachedTenantRow> {
  final Value<String> id;
  final Value<String> organizationId;
  final Value<String> displayName;
  final Value<String> phone;
  final Value<String> normalizedSearchText;
  final Value<String> payload;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedTenantsCompanion({
    this.id = const Value.absent(),
    this.organizationId = const Value.absent(),
    this.displayName = const Value.absent(),
    this.phone = const Value.absent(),
    this.normalizedSearchText = const Value.absent(),
    this.payload = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedTenantsCompanion.insert({
    required String id,
    required String organizationId,
    required String displayName,
    required String phone,
    required String normalizedSearchText,
    required String payload,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       organizationId = Value(organizationId),
       displayName = Value(displayName),
       phone = Value(phone),
       normalizedSearchText = Value(normalizedSearchText),
       payload = Value(payload);
  static Insertable<CachedTenantRow> custom({
    Expression<String>? id,
    Expression<String>? organizationId,
    Expression<String>? displayName,
    Expression<String>? phone,
    Expression<String>? normalizedSearchText,
    Expression<String>? payload,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (organizationId != null) 'organization_id': organizationId,
      if (displayName != null) 'display_name': displayName,
      if (phone != null) 'phone': phone,
      if (normalizedSearchText != null)
        'normalized_search_text': normalizedSearchText,
      if (payload != null) 'payload': payload,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedTenantsCompanion copyWith({
    Value<String>? id,
    Value<String>? organizationId,
    Value<String>? displayName,
    Value<String>? phone,
    Value<String>? normalizedSearchText,
    Value<String>? payload,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedTenantsCompanion(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      displayName: displayName ?? this.displayName,
      phone: phone ?? this.phone,
      normalizedSearchText: normalizedSearchText ?? this.normalizedSearchText,
      payload: payload ?? this.payload,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (organizationId.present) {
      map['organization_id'] = Variable<String>(organizationId.value);
    }
    if (displayName.present) {
      map['display_name'] = Variable<String>(displayName.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
    }
    if (normalizedSearchText.present) {
      map['normalized_search_text'] = Variable<String>(
        normalizedSearchText.value,
      );
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedTenantsCompanion(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('displayName: $displayName, ')
          ..write('phone: $phone, ')
          ..write('normalizedSearchText: $normalizedSearchText, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedLeasesTable extends CachedLeases
    with TableInfo<$CachedLeasesTable, CachedLeaseRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedLeasesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _organizationIdMeta = const VerificationMeta(
    'organizationId',
  );
  @override
  late final GeneratedColumn<String> organizationId = GeneratedColumn<String>(
    'organization_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _unitIdMeta = const VerificationMeta('unitId');
  @override
  late final GeneratedColumn<String> unitId = GeneratedColumn<String>(
    'unit_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tenantIdMeta = const VerificationMeta(
    'tenantId',
  );
  @override
  late final GeneratedColumn<String> tenantId = GeneratedColumn<String>(
    'tenant_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _propertyIdMeta = const VerificationMeta(
    'propertyId',
  );
  @override
  late final GeneratedColumn<String> propertyId = GeneratedColumn<String>(
    'property_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    organizationId,
    unitId,
    tenantId,
    propertyId,
    status,
    payload,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_leases';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedLeaseRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('organization_id')) {
      context.handle(
        _organizationIdMeta,
        organizationId.isAcceptableOrUnknown(
          data['organization_id']!,
          _organizationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_organizationIdMeta);
    }
    if (data.containsKey('unit_id')) {
      context.handle(
        _unitIdMeta,
        unitId.isAcceptableOrUnknown(data['unit_id']!, _unitIdMeta),
      );
    } else if (isInserting) {
      context.missing(_unitIdMeta);
    }
    if (data.containsKey('tenant_id')) {
      context.handle(
        _tenantIdMeta,
        tenantId.isAcceptableOrUnknown(data['tenant_id']!, _tenantIdMeta),
      );
    } else if (isInserting) {
      context.missing(_tenantIdMeta);
    }
    if (data.containsKey('property_id')) {
      context.handle(
        _propertyIdMeta,
        propertyId.isAcceptableOrUnknown(data['property_id']!, _propertyIdMeta),
      );
    } else if (isInserting) {
      context.missing(_propertyIdMeta);
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedLeaseRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedLeaseRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      organizationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}organization_id'],
      )!,
      unitId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}unit_id'],
      )!,
      tenantId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tenant_id'],
      )!,
      propertyId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}property_id'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedLeasesTable createAlias(String alias) {
    return $CachedLeasesTable(attachedDatabase, alias);
  }
}

class CachedLeaseRow extends DataClass implements Insertable<CachedLeaseRow> {
  final String id;
  final String organizationId;
  final String unitId;
  final String tenantId;
  final String propertyId;
  final String status;

  /// JSON de `LeaseSummary` ou `LeaseDetail` selon le dernier appel réseau.
  final String payload;
  final DateTime cachedAt;
  const CachedLeaseRow({
    required this.id,
    required this.organizationId,
    required this.unitId,
    required this.tenantId,
    required this.propertyId,
    required this.status,
    required this.payload,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['organization_id'] = Variable<String>(organizationId);
    map['unit_id'] = Variable<String>(unitId);
    map['tenant_id'] = Variable<String>(tenantId);
    map['property_id'] = Variable<String>(propertyId);
    map['status'] = Variable<String>(status);
    map['payload'] = Variable<String>(payload);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedLeasesCompanion toCompanion(bool nullToAbsent) {
    return CachedLeasesCompanion(
      id: Value(id),
      organizationId: Value(organizationId),
      unitId: Value(unitId),
      tenantId: Value(tenantId),
      propertyId: Value(propertyId),
      status: Value(status),
      payload: Value(payload),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedLeaseRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedLeaseRow(
      id: serializer.fromJson<String>(json['id']),
      organizationId: serializer.fromJson<String>(json['organizationId']),
      unitId: serializer.fromJson<String>(json['unitId']),
      tenantId: serializer.fromJson<String>(json['tenantId']),
      propertyId: serializer.fromJson<String>(json['propertyId']),
      status: serializer.fromJson<String>(json['status']),
      payload: serializer.fromJson<String>(json['payload']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'organizationId': serializer.toJson<String>(organizationId),
      'unitId': serializer.toJson<String>(unitId),
      'tenantId': serializer.toJson<String>(tenantId),
      'propertyId': serializer.toJson<String>(propertyId),
      'status': serializer.toJson<String>(status),
      'payload': serializer.toJson<String>(payload),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedLeaseRow copyWith({
    String? id,
    String? organizationId,
    String? unitId,
    String? tenantId,
    String? propertyId,
    String? status,
    String? payload,
    DateTime? cachedAt,
  }) => CachedLeaseRow(
    id: id ?? this.id,
    organizationId: organizationId ?? this.organizationId,
    unitId: unitId ?? this.unitId,
    tenantId: tenantId ?? this.tenantId,
    propertyId: propertyId ?? this.propertyId,
    status: status ?? this.status,
    payload: payload ?? this.payload,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedLeaseRow copyWithCompanion(CachedLeasesCompanion data) {
    return CachedLeaseRow(
      id: data.id.present ? data.id.value : this.id,
      organizationId: data.organizationId.present
          ? data.organizationId.value
          : this.organizationId,
      unitId: data.unitId.present ? data.unitId.value : this.unitId,
      tenantId: data.tenantId.present ? data.tenantId.value : this.tenantId,
      propertyId: data.propertyId.present
          ? data.propertyId.value
          : this.propertyId,
      status: data.status.present ? data.status.value : this.status,
      payload: data.payload.present ? data.payload.value : this.payload,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedLeaseRow(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('unitId: $unitId, ')
          ..write('tenantId: $tenantId, ')
          ..write('propertyId: $propertyId, ')
          ..write('status: $status, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    organizationId,
    unitId,
    tenantId,
    propertyId,
    status,
    payload,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedLeaseRow &&
          other.id == this.id &&
          other.organizationId == this.organizationId &&
          other.unitId == this.unitId &&
          other.tenantId == this.tenantId &&
          other.propertyId == this.propertyId &&
          other.status == this.status &&
          other.payload == this.payload &&
          other.cachedAt == this.cachedAt);
}

class CachedLeasesCompanion extends UpdateCompanion<CachedLeaseRow> {
  final Value<String> id;
  final Value<String> organizationId;
  final Value<String> unitId;
  final Value<String> tenantId;
  final Value<String> propertyId;
  final Value<String> status;
  final Value<String> payload;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedLeasesCompanion({
    this.id = const Value.absent(),
    this.organizationId = const Value.absent(),
    this.unitId = const Value.absent(),
    this.tenantId = const Value.absent(),
    this.propertyId = const Value.absent(),
    this.status = const Value.absent(),
    this.payload = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedLeasesCompanion.insert({
    required String id,
    required String organizationId,
    required String unitId,
    required String tenantId,
    required String propertyId,
    required String status,
    required String payload,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       organizationId = Value(organizationId),
       unitId = Value(unitId),
       tenantId = Value(tenantId),
       propertyId = Value(propertyId),
       status = Value(status),
       payload = Value(payload);
  static Insertable<CachedLeaseRow> custom({
    Expression<String>? id,
    Expression<String>? organizationId,
    Expression<String>? unitId,
    Expression<String>? tenantId,
    Expression<String>? propertyId,
    Expression<String>? status,
    Expression<String>? payload,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (organizationId != null) 'organization_id': organizationId,
      if (unitId != null) 'unit_id': unitId,
      if (tenantId != null) 'tenant_id': tenantId,
      if (propertyId != null) 'property_id': propertyId,
      if (status != null) 'status': status,
      if (payload != null) 'payload': payload,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedLeasesCompanion copyWith({
    Value<String>? id,
    Value<String>? organizationId,
    Value<String>? unitId,
    Value<String>? tenantId,
    Value<String>? propertyId,
    Value<String>? status,
    Value<String>? payload,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedLeasesCompanion(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      unitId: unitId ?? this.unitId,
      tenantId: tenantId ?? this.tenantId,
      propertyId: propertyId ?? this.propertyId,
      status: status ?? this.status,
      payload: payload ?? this.payload,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (organizationId.present) {
      map['organization_id'] = Variable<String>(organizationId.value);
    }
    if (unitId.present) {
      map['unit_id'] = Variable<String>(unitId.value);
    }
    if (tenantId.present) {
      map['tenant_id'] = Variable<String>(tenantId.value);
    }
    if (propertyId.present) {
      map['property_id'] = Variable<String>(propertyId.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedLeasesCompanion(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('unitId: $unitId, ')
          ..write('tenantId: $tenantId, ')
          ..write('propertyId: $propertyId, ')
          ..write('status: $status, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedInvoicesTable extends CachedInvoices
    with TableInfo<$CachedInvoicesTable, CachedInvoiceRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedInvoicesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _organizationIdMeta = const VerificationMeta(
    'organizationId',
  );
  @override
  late final GeneratedColumn<String> organizationId = GeneratedColumn<String>(
    'organization_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _leaseIdMeta = const VerificationMeta(
    'leaseId',
  );
  @override
  late final GeneratedColumn<String> leaseId = GeneratedColumn<String>(
    'lease_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _propertyIdMeta = const VerificationMeta(
    'propertyId',
  );
  @override
  late final GeneratedColumn<String> propertyId = GeneratedColumn<String>(
    'property_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dueDateMeta = const VerificationMeta(
    'dueDate',
  );
  @override
  late final GeneratedColumn<String> dueDate = GeneratedColumn<String>(
    'due_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    organizationId,
    leaseId,
    propertyId,
    dueDate,
    payload,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_invoices';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedInvoiceRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('organization_id')) {
      context.handle(
        _organizationIdMeta,
        organizationId.isAcceptableOrUnknown(
          data['organization_id']!,
          _organizationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_organizationIdMeta);
    }
    if (data.containsKey('lease_id')) {
      context.handle(
        _leaseIdMeta,
        leaseId.isAcceptableOrUnknown(data['lease_id']!, _leaseIdMeta),
      );
    } else if (isInserting) {
      context.missing(_leaseIdMeta);
    }
    if (data.containsKey('property_id')) {
      context.handle(
        _propertyIdMeta,
        propertyId.isAcceptableOrUnknown(data['property_id']!, _propertyIdMeta),
      );
    } else if (isInserting) {
      context.missing(_propertyIdMeta);
    }
    if (data.containsKey('due_date')) {
      context.handle(
        _dueDateMeta,
        dueDate.isAcceptableOrUnknown(data['due_date']!, _dueDateMeta),
      );
    } else if (isInserting) {
      context.missing(_dueDateMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedInvoiceRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedInvoiceRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      organizationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}organization_id'],
      )!,
      leaseId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}lease_id'],
      )!,
      propertyId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}property_id'],
      )!,
      dueDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}due_date'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedInvoicesTable createAlias(String alias) {
    return $CachedInvoicesTable(attachedDatabase, alias);
  }
}

class CachedInvoiceRow extends DataClass
    implements Insertable<CachedInvoiceRow> {
  final String id;
  final String organizationId;
  final String leaseId;
  final String propertyId;
  final String dueDate;

  /// JSON de `InvoiceSummary`.
  final String payload;
  final DateTime cachedAt;
  const CachedInvoiceRow({
    required this.id,
    required this.organizationId,
    required this.leaseId,
    required this.propertyId,
    required this.dueDate,
    required this.payload,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['organization_id'] = Variable<String>(organizationId);
    map['lease_id'] = Variable<String>(leaseId);
    map['property_id'] = Variable<String>(propertyId);
    map['due_date'] = Variable<String>(dueDate);
    map['payload'] = Variable<String>(payload);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedInvoicesCompanion toCompanion(bool nullToAbsent) {
    return CachedInvoicesCompanion(
      id: Value(id),
      organizationId: Value(organizationId),
      leaseId: Value(leaseId),
      propertyId: Value(propertyId),
      dueDate: Value(dueDate),
      payload: Value(payload),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedInvoiceRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedInvoiceRow(
      id: serializer.fromJson<String>(json['id']),
      organizationId: serializer.fromJson<String>(json['organizationId']),
      leaseId: serializer.fromJson<String>(json['leaseId']),
      propertyId: serializer.fromJson<String>(json['propertyId']),
      dueDate: serializer.fromJson<String>(json['dueDate']),
      payload: serializer.fromJson<String>(json['payload']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'organizationId': serializer.toJson<String>(organizationId),
      'leaseId': serializer.toJson<String>(leaseId),
      'propertyId': serializer.toJson<String>(propertyId),
      'dueDate': serializer.toJson<String>(dueDate),
      'payload': serializer.toJson<String>(payload),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedInvoiceRow copyWith({
    String? id,
    String? organizationId,
    String? leaseId,
    String? propertyId,
    String? dueDate,
    String? payload,
    DateTime? cachedAt,
  }) => CachedInvoiceRow(
    id: id ?? this.id,
    organizationId: organizationId ?? this.organizationId,
    leaseId: leaseId ?? this.leaseId,
    propertyId: propertyId ?? this.propertyId,
    dueDate: dueDate ?? this.dueDate,
    payload: payload ?? this.payload,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedInvoiceRow copyWithCompanion(CachedInvoicesCompanion data) {
    return CachedInvoiceRow(
      id: data.id.present ? data.id.value : this.id,
      organizationId: data.organizationId.present
          ? data.organizationId.value
          : this.organizationId,
      leaseId: data.leaseId.present ? data.leaseId.value : this.leaseId,
      propertyId: data.propertyId.present
          ? data.propertyId.value
          : this.propertyId,
      dueDate: data.dueDate.present ? data.dueDate.value : this.dueDate,
      payload: data.payload.present ? data.payload.value : this.payload,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedInvoiceRow(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('leaseId: $leaseId, ')
          ..write('propertyId: $propertyId, ')
          ..write('dueDate: $dueDate, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    organizationId,
    leaseId,
    propertyId,
    dueDate,
    payload,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedInvoiceRow &&
          other.id == this.id &&
          other.organizationId == this.organizationId &&
          other.leaseId == this.leaseId &&
          other.propertyId == this.propertyId &&
          other.dueDate == this.dueDate &&
          other.payload == this.payload &&
          other.cachedAt == this.cachedAt);
}

class CachedInvoicesCompanion extends UpdateCompanion<CachedInvoiceRow> {
  final Value<String> id;
  final Value<String> organizationId;
  final Value<String> leaseId;
  final Value<String> propertyId;
  final Value<String> dueDate;
  final Value<String> payload;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedInvoicesCompanion({
    this.id = const Value.absent(),
    this.organizationId = const Value.absent(),
    this.leaseId = const Value.absent(),
    this.propertyId = const Value.absent(),
    this.dueDate = const Value.absent(),
    this.payload = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedInvoicesCompanion.insert({
    required String id,
    required String organizationId,
    required String leaseId,
    required String propertyId,
    required String dueDate,
    required String payload,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       organizationId = Value(organizationId),
       leaseId = Value(leaseId),
       propertyId = Value(propertyId),
       dueDate = Value(dueDate),
       payload = Value(payload);
  static Insertable<CachedInvoiceRow> custom({
    Expression<String>? id,
    Expression<String>? organizationId,
    Expression<String>? leaseId,
    Expression<String>? propertyId,
    Expression<String>? dueDate,
    Expression<String>? payload,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (organizationId != null) 'organization_id': organizationId,
      if (leaseId != null) 'lease_id': leaseId,
      if (propertyId != null) 'property_id': propertyId,
      if (dueDate != null) 'due_date': dueDate,
      if (payload != null) 'payload': payload,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedInvoicesCompanion copyWith({
    Value<String>? id,
    Value<String>? organizationId,
    Value<String>? leaseId,
    Value<String>? propertyId,
    Value<String>? dueDate,
    Value<String>? payload,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedInvoicesCompanion(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      leaseId: leaseId ?? this.leaseId,
      propertyId: propertyId ?? this.propertyId,
      dueDate: dueDate ?? this.dueDate,
      payload: payload ?? this.payload,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (organizationId.present) {
      map['organization_id'] = Variable<String>(organizationId.value);
    }
    if (leaseId.present) {
      map['lease_id'] = Variable<String>(leaseId.value);
    }
    if (propertyId.present) {
      map['property_id'] = Variable<String>(propertyId.value);
    }
    if (dueDate.present) {
      map['due_date'] = Variable<String>(dueDate.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedInvoicesCompanion(')
          ..write('id: $id, ')
          ..write('organizationId: $organizationId, ')
          ..write('leaseId: $leaseId, ')
          ..write('propertyId: $propertyId, ')
          ..write('dueDate: $dueDate, ')
          ..write('payload: $payload, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $AppSettingsTable appSettings = $AppSettingsTable(this);
  late final $OutboxTable outbox = $OutboxTable(this);
  late final $CachedPropertiesTable cachedProperties = $CachedPropertiesTable(
    this,
  );
  late final $CachedUnitsTable cachedUnits = $CachedUnitsTable(this);
  late final $CachedTenantsTable cachedTenants = $CachedTenantsTable(this);
  late final $CachedLeasesTable cachedLeases = $CachedLeasesTable(this);
  late final $CachedInvoicesTable cachedInvoices = $CachedInvoicesTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    appSettings,
    outbox,
    cachedProperties,
    cachedUnits,
    cachedTenants,
    cachedLeases,
    cachedInvoices,
  ];
}

typedef $$AppSettingsTableCreateCompanionBuilder =
    AppSettingsCompanion Function({
      required String key,
      required String value,
      Value<int> rowid,
    });
typedef $$AppSettingsTableUpdateCompanionBuilder =
    AppSettingsCompanion Function({
      Value<String> key,
      Value<String> value,
      Value<int> rowid,
    });

class $$AppSettingsTableFilterComposer
    extends Composer<_$AppDatabase, $AppSettingsTable> {
  $$AppSettingsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnFilters(column),
  );
}

class $$AppSettingsTableOrderingComposer
    extends Composer<_$AppDatabase, $AppSettingsTable> {
  $$AppSettingsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$AppSettingsTableAnnotationComposer
    extends Composer<_$AppDatabase, $AppSettingsTable> {
  $$AppSettingsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$AppSettingsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $AppSettingsTable,
          AppSettingRow,
          $$AppSettingsTableFilterComposer,
          $$AppSettingsTableOrderingComposer,
          $$AppSettingsTableAnnotationComposer,
          $$AppSettingsTableCreateCompanionBuilder,
          $$AppSettingsTableUpdateCompanionBuilder,
          (
            AppSettingRow,
            BaseReferences<_$AppDatabase, $AppSettingsTable, AppSettingRow>,
          ),
          AppSettingRow,
          PrefetchHooks Function()
        > {
  $$AppSettingsTableTableManager(_$AppDatabase db, $AppSettingsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$AppSettingsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$AppSettingsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$AppSettingsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> key = const Value.absent(),
                Value<String> value = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => AppSettingsCompanion(key: key, value: value, rowid: rowid),
          createCompanionCallback:
              ({
                required String key,
                required String value,
                Value<int> rowid = const Value.absent(),
              }) => AppSettingsCompanion.insert(
                key: key,
                value: value,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$AppSettingsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $AppSettingsTable,
      AppSettingRow,
      $$AppSettingsTableFilterComposer,
      $$AppSettingsTableOrderingComposer,
      $$AppSettingsTableAnnotationComposer,
      $$AppSettingsTableCreateCompanionBuilder,
      $$AppSettingsTableUpdateCompanionBuilder,
      (
        AppSettingRow,
        BaseReferences<_$AppDatabase, $AppSettingsTable, AppSettingRow>,
      ),
      AppSettingRow,
      PrefetchHooks Function()
    >;
typedef $$OutboxTableCreateCompanionBuilder =
    OutboxCompanion Function({
      required String clientRef,
      required String organizationId,
      required String operation,
      required String payload,
      Value<String?> dependsOnClientRef,
      Value<int> attemptCount,
      Value<String> status,
      Value<String?> lastErrorCode,
      Value<DateTime> createdAt,
      Value<DateTime> nextAttemptAt,
      Value<int> rowid,
    });
typedef $$OutboxTableUpdateCompanionBuilder =
    OutboxCompanion Function({
      Value<String> clientRef,
      Value<String> organizationId,
      Value<String> operation,
      Value<String> payload,
      Value<String?> dependsOnClientRef,
      Value<int> attemptCount,
      Value<String> status,
      Value<String?> lastErrorCode,
      Value<DateTime> createdAt,
      Value<DateTime> nextAttemptAt,
      Value<int> rowid,
    });

class $$OutboxTableFilterComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get clientRef => $composableBuilder(
    column: $table.clientRef,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operation => $composableBuilder(
    column: $table.operation,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dependsOnClientRef => $composableBuilder(
    column: $table.dependsOnClientRef,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get attemptCount => $composableBuilder(
    column: $table.attemptCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastErrorCode => $composableBuilder(
    column: $table.lastErrorCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get nextAttemptAt => $composableBuilder(
    column: $table.nextAttemptAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$OutboxTableOrderingComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get clientRef => $composableBuilder(
    column: $table.clientRef,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operation => $composableBuilder(
    column: $table.operation,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dependsOnClientRef => $composableBuilder(
    column: $table.dependsOnClientRef,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get attemptCount => $composableBuilder(
    column: $table.attemptCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastErrorCode => $composableBuilder(
    column: $table.lastErrorCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get nextAttemptAt => $composableBuilder(
    column: $table.nextAttemptAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OutboxTableAnnotationComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get clientRef =>
      $composableBuilder(column: $table.clientRef, builder: (column) => column);

  GeneratedColumn<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get operation =>
      $composableBuilder(column: $table.operation, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<String> get dependsOnClientRef => $composableBuilder(
    column: $table.dependsOnClientRef,
    builder: (column) => column,
  );

  GeneratedColumn<int> get attemptCount => $composableBuilder(
    column: $table.attemptCount,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get lastErrorCode => $composableBuilder(
    column: $table.lastErrorCode,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get nextAttemptAt => $composableBuilder(
    column: $table.nextAttemptAt,
    builder: (column) => column,
  );
}

class $$OutboxTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OutboxTable,
          OutboxRow,
          $$OutboxTableFilterComposer,
          $$OutboxTableOrderingComposer,
          $$OutboxTableAnnotationComposer,
          $$OutboxTableCreateCompanionBuilder,
          $$OutboxTableUpdateCompanionBuilder,
          (OutboxRow, BaseReferences<_$AppDatabase, $OutboxTable, OutboxRow>),
          OutboxRow,
          PrefetchHooks Function()
        > {
  $$OutboxTableTableManager(_$AppDatabase db, $OutboxTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OutboxTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OutboxTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OutboxTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> clientRef = const Value.absent(),
                Value<String> organizationId = const Value.absent(),
                Value<String> operation = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<String?> dependsOnClientRef = const Value.absent(),
                Value<int> attemptCount = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String?> lastErrorCode = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> nextAttemptAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OutboxCompanion(
                clientRef: clientRef,
                organizationId: organizationId,
                operation: operation,
                payload: payload,
                dependsOnClientRef: dependsOnClientRef,
                attemptCount: attemptCount,
                status: status,
                lastErrorCode: lastErrorCode,
                createdAt: createdAt,
                nextAttemptAt: nextAttemptAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String clientRef,
                required String organizationId,
                required String operation,
                required String payload,
                Value<String?> dependsOnClientRef = const Value.absent(),
                Value<int> attemptCount = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String?> lastErrorCode = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> nextAttemptAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OutboxCompanion.insert(
                clientRef: clientRef,
                organizationId: organizationId,
                operation: operation,
                payload: payload,
                dependsOnClientRef: dependsOnClientRef,
                attemptCount: attemptCount,
                status: status,
                lastErrorCode: lastErrorCode,
                createdAt: createdAt,
                nextAttemptAt: nextAttemptAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OutboxTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OutboxTable,
      OutboxRow,
      $$OutboxTableFilterComposer,
      $$OutboxTableOrderingComposer,
      $$OutboxTableAnnotationComposer,
      $$OutboxTableCreateCompanionBuilder,
      $$OutboxTableUpdateCompanionBuilder,
      (OutboxRow, BaseReferences<_$AppDatabase, $OutboxTable, OutboxRow>),
      OutboxRow,
      PrefetchHooks Function()
    >;
typedef $$CachedPropertiesTableCreateCompanionBuilder =
    CachedPropertiesCompanion Function({
      required String id,
      required String organizationId,
      required String name,
      required String city,
      required String payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedPropertiesTableUpdateCompanionBuilder =
    CachedPropertiesCompanion Function({
      Value<String> id,
      Value<String> organizationId,
      Value<String> name,
      Value<String> city,
      Value<String> payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedPropertiesTableFilterComposer
    extends Composer<_$AppDatabase, $CachedPropertiesTable> {
  $$CachedPropertiesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get city => $composableBuilder(
    column: $table.city,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedPropertiesTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedPropertiesTable> {
  $$CachedPropertiesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get city => $composableBuilder(
    column: $table.city,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedPropertiesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedPropertiesTable> {
  $$CachedPropertiesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get city =>
      $composableBuilder(column: $table.city, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedPropertiesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedPropertiesTable,
          CachedPropertyRow,
          $$CachedPropertiesTableFilterComposer,
          $$CachedPropertiesTableOrderingComposer,
          $$CachedPropertiesTableAnnotationComposer,
          $$CachedPropertiesTableCreateCompanionBuilder,
          $$CachedPropertiesTableUpdateCompanionBuilder,
          (
            CachedPropertyRow,
            BaseReferences<
              _$AppDatabase,
              $CachedPropertiesTable,
              CachedPropertyRow
            >,
          ),
          CachedPropertyRow,
          PrefetchHooks Function()
        > {
  $$CachedPropertiesTableTableManager(
    _$AppDatabase db,
    $CachedPropertiesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedPropertiesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedPropertiesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedPropertiesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> organizationId = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> city = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPropertiesCompanion(
                id: id,
                organizationId: organizationId,
                name: name,
                city: city,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String organizationId,
                required String name,
                required String city,
                required String payload,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPropertiesCompanion.insert(
                id: id,
                organizationId: organizationId,
                name: name,
                city: city,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedPropertiesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedPropertiesTable,
      CachedPropertyRow,
      $$CachedPropertiesTableFilterComposer,
      $$CachedPropertiesTableOrderingComposer,
      $$CachedPropertiesTableAnnotationComposer,
      $$CachedPropertiesTableCreateCompanionBuilder,
      $$CachedPropertiesTableUpdateCompanionBuilder,
      (
        CachedPropertyRow,
        BaseReferences<
          _$AppDatabase,
          $CachedPropertiesTable,
          CachedPropertyRow
        >,
      ),
      CachedPropertyRow,
      PrefetchHooks Function()
    >;
typedef $$CachedUnitsTableCreateCompanionBuilder =
    CachedUnitsCompanion Function({
      required String id,
      required String organizationId,
      required String propertyId,
      required String payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedUnitsTableUpdateCompanionBuilder =
    CachedUnitsCompanion Function({
      Value<String> id,
      Value<String> organizationId,
      Value<String> propertyId,
      Value<String> payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedUnitsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedUnitsTable> {
  $$CachedUnitsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedUnitsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedUnitsTable> {
  $$CachedUnitsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedUnitsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedUnitsTable> {
  $$CachedUnitsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedUnitsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedUnitsTable,
          CachedUnitRow,
          $$CachedUnitsTableFilterComposer,
          $$CachedUnitsTableOrderingComposer,
          $$CachedUnitsTableAnnotationComposer,
          $$CachedUnitsTableCreateCompanionBuilder,
          $$CachedUnitsTableUpdateCompanionBuilder,
          (
            CachedUnitRow,
            BaseReferences<_$AppDatabase, $CachedUnitsTable, CachedUnitRow>,
          ),
          CachedUnitRow,
          PrefetchHooks Function()
        > {
  $$CachedUnitsTableTableManager(_$AppDatabase db, $CachedUnitsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedUnitsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedUnitsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedUnitsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> organizationId = const Value.absent(),
                Value<String> propertyId = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedUnitsCompanion(
                id: id,
                organizationId: organizationId,
                propertyId: propertyId,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String organizationId,
                required String propertyId,
                required String payload,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedUnitsCompanion.insert(
                id: id,
                organizationId: organizationId,
                propertyId: propertyId,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedUnitsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedUnitsTable,
      CachedUnitRow,
      $$CachedUnitsTableFilterComposer,
      $$CachedUnitsTableOrderingComposer,
      $$CachedUnitsTableAnnotationComposer,
      $$CachedUnitsTableCreateCompanionBuilder,
      $$CachedUnitsTableUpdateCompanionBuilder,
      (
        CachedUnitRow,
        BaseReferences<_$AppDatabase, $CachedUnitsTable, CachedUnitRow>,
      ),
      CachedUnitRow,
      PrefetchHooks Function()
    >;
typedef $$CachedTenantsTableCreateCompanionBuilder =
    CachedTenantsCompanion Function({
      required String id,
      required String organizationId,
      required String displayName,
      required String phone,
      required String normalizedSearchText,
      required String payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedTenantsTableUpdateCompanionBuilder =
    CachedTenantsCompanion Function({
      Value<String> id,
      Value<String> organizationId,
      Value<String> displayName,
      Value<String> phone,
      Value<String> normalizedSearchText,
      Value<String> payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedTenantsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedTenantsTable> {
  $$CachedTenantsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get displayName => $composableBuilder(
    column: $table.displayName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get phone => $composableBuilder(
    column: $table.phone,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get normalizedSearchText => $composableBuilder(
    column: $table.normalizedSearchText,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedTenantsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedTenantsTable> {
  $$CachedTenantsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get displayName => $composableBuilder(
    column: $table.displayName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get phone => $composableBuilder(
    column: $table.phone,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get normalizedSearchText => $composableBuilder(
    column: $table.normalizedSearchText,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedTenantsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedTenantsTable> {
  $$CachedTenantsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get displayName => $composableBuilder(
    column: $table.displayName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

  GeneratedColumn<String> get normalizedSearchText => $composableBuilder(
    column: $table.normalizedSearchText,
    builder: (column) => column,
  );

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedTenantsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedTenantsTable,
          CachedTenantRow,
          $$CachedTenantsTableFilterComposer,
          $$CachedTenantsTableOrderingComposer,
          $$CachedTenantsTableAnnotationComposer,
          $$CachedTenantsTableCreateCompanionBuilder,
          $$CachedTenantsTableUpdateCompanionBuilder,
          (
            CachedTenantRow,
            BaseReferences<_$AppDatabase, $CachedTenantsTable, CachedTenantRow>,
          ),
          CachedTenantRow,
          PrefetchHooks Function()
        > {
  $$CachedTenantsTableTableManager(_$AppDatabase db, $CachedTenantsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedTenantsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedTenantsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedTenantsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> organizationId = const Value.absent(),
                Value<String> displayName = const Value.absent(),
                Value<String> phone = const Value.absent(),
                Value<String> normalizedSearchText = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedTenantsCompanion(
                id: id,
                organizationId: organizationId,
                displayName: displayName,
                phone: phone,
                normalizedSearchText: normalizedSearchText,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String organizationId,
                required String displayName,
                required String phone,
                required String normalizedSearchText,
                required String payload,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedTenantsCompanion.insert(
                id: id,
                organizationId: organizationId,
                displayName: displayName,
                phone: phone,
                normalizedSearchText: normalizedSearchText,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedTenantsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedTenantsTable,
      CachedTenantRow,
      $$CachedTenantsTableFilterComposer,
      $$CachedTenantsTableOrderingComposer,
      $$CachedTenantsTableAnnotationComposer,
      $$CachedTenantsTableCreateCompanionBuilder,
      $$CachedTenantsTableUpdateCompanionBuilder,
      (
        CachedTenantRow,
        BaseReferences<_$AppDatabase, $CachedTenantsTable, CachedTenantRow>,
      ),
      CachedTenantRow,
      PrefetchHooks Function()
    >;
typedef $$CachedLeasesTableCreateCompanionBuilder =
    CachedLeasesCompanion Function({
      required String id,
      required String organizationId,
      required String unitId,
      required String tenantId,
      required String propertyId,
      required String status,
      required String payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedLeasesTableUpdateCompanionBuilder =
    CachedLeasesCompanion Function({
      Value<String> id,
      Value<String> organizationId,
      Value<String> unitId,
      Value<String> tenantId,
      Value<String> propertyId,
      Value<String> status,
      Value<String> payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedLeasesTableFilterComposer
    extends Composer<_$AppDatabase, $CachedLeasesTable> {
  $$CachedLeasesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get unitId => $composableBuilder(
    column: $table.unitId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tenantId => $composableBuilder(
    column: $table.tenantId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedLeasesTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedLeasesTable> {
  $$CachedLeasesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get unitId => $composableBuilder(
    column: $table.unitId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tenantId => $composableBuilder(
    column: $table.tenantId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedLeasesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedLeasesTable> {
  $$CachedLeasesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get unitId =>
      $composableBuilder(column: $table.unitId, builder: (column) => column);

  GeneratedColumn<String> get tenantId =>
      $composableBuilder(column: $table.tenantId, builder: (column) => column);

  GeneratedColumn<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedLeasesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedLeasesTable,
          CachedLeaseRow,
          $$CachedLeasesTableFilterComposer,
          $$CachedLeasesTableOrderingComposer,
          $$CachedLeasesTableAnnotationComposer,
          $$CachedLeasesTableCreateCompanionBuilder,
          $$CachedLeasesTableUpdateCompanionBuilder,
          (
            CachedLeaseRow,
            BaseReferences<_$AppDatabase, $CachedLeasesTable, CachedLeaseRow>,
          ),
          CachedLeaseRow,
          PrefetchHooks Function()
        > {
  $$CachedLeasesTableTableManager(_$AppDatabase db, $CachedLeasesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedLeasesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedLeasesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedLeasesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> organizationId = const Value.absent(),
                Value<String> unitId = const Value.absent(),
                Value<String> tenantId = const Value.absent(),
                Value<String> propertyId = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedLeasesCompanion(
                id: id,
                organizationId: organizationId,
                unitId: unitId,
                tenantId: tenantId,
                propertyId: propertyId,
                status: status,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String organizationId,
                required String unitId,
                required String tenantId,
                required String propertyId,
                required String status,
                required String payload,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedLeasesCompanion.insert(
                id: id,
                organizationId: organizationId,
                unitId: unitId,
                tenantId: tenantId,
                propertyId: propertyId,
                status: status,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedLeasesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedLeasesTable,
      CachedLeaseRow,
      $$CachedLeasesTableFilterComposer,
      $$CachedLeasesTableOrderingComposer,
      $$CachedLeasesTableAnnotationComposer,
      $$CachedLeasesTableCreateCompanionBuilder,
      $$CachedLeasesTableUpdateCompanionBuilder,
      (
        CachedLeaseRow,
        BaseReferences<_$AppDatabase, $CachedLeasesTable, CachedLeaseRow>,
      ),
      CachedLeaseRow,
      PrefetchHooks Function()
    >;
typedef $$CachedInvoicesTableCreateCompanionBuilder =
    CachedInvoicesCompanion Function({
      required String id,
      required String organizationId,
      required String leaseId,
      required String propertyId,
      required String dueDate,
      required String payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedInvoicesTableUpdateCompanionBuilder =
    CachedInvoicesCompanion Function({
      Value<String> id,
      Value<String> organizationId,
      Value<String> leaseId,
      Value<String> propertyId,
      Value<String> dueDate,
      Value<String> payload,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedInvoicesTableFilterComposer
    extends Composer<_$AppDatabase, $CachedInvoicesTable> {
  $$CachedInvoicesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get leaseId => $composableBuilder(
    column: $table.leaseId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dueDate => $composableBuilder(
    column: $table.dueDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedInvoicesTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedInvoicesTable> {
  $$CachedInvoicesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get leaseId => $composableBuilder(
    column: $table.leaseId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dueDate => $composableBuilder(
    column: $table.dueDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedInvoicesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedInvoicesTable> {
  $$CachedInvoicesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get organizationId => $composableBuilder(
    column: $table.organizationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get leaseId =>
      $composableBuilder(column: $table.leaseId, builder: (column) => column);

  GeneratedColumn<String> get propertyId => $composableBuilder(
    column: $table.propertyId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get dueDate =>
      $composableBuilder(column: $table.dueDate, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedInvoicesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedInvoicesTable,
          CachedInvoiceRow,
          $$CachedInvoicesTableFilterComposer,
          $$CachedInvoicesTableOrderingComposer,
          $$CachedInvoicesTableAnnotationComposer,
          $$CachedInvoicesTableCreateCompanionBuilder,
          $$CachedInvoicesTableUpdateCompanionBuilder,
          (
            CachedInvoiceRow,
            BaseReferences<
              _$AppDatabase,
              $CachedInvoicesTable,
              CachedInvoiceRow
            >,
          ),
          CachedInvoiceRow,
          PrefetchHooks Function()
        > {
  $$CachedInvoicesTableTableManager(
    _$AppDatabase db,
    $CachedInvoicesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedInvoicesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedInvoicesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedInvoicesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> organizationId = const Value.absent(),
                Value<String> leaseId = const Value.absent(),
                Value<String> propertyId = const Value.absent(),
                Value<String> dueDate = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedInvoicesCompanion(
                id: id,
                organizationId: organizationId,
                leaseId: leaseId,
                propertyId: propertyId,
                dueDate: dueDate,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String organizationId,
                required String leaseId,
                required String propertyId,
                required String dueDate,
                required String payload,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedInvoicesCompanion.insert(
                id: id,
                organizationId: organizationId,
                leaseId: leaseId,
                propertyId: propertyId,
                dueDate: dueDate,
                payload: payload,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedInvoicesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedInvoicesTable,
      CachedInvoiceRow,
      $$CachedInvoicesTableFilterComposer,
      $$CachedInvoicesTableOrderingComposer,
      $$CachedInvoicesTableAnnotationComposer,
      $$CachedInvoicesTableCreateCompanionBuilder,
      $$CachedInvoicesTableUpdateCompanionBuilder,
      (
        CachedInvoiceRow,
        BaseReferences<_$AppDatabase, $CachedInvoicesTable, CachedInvoiceRow>,
      ),
      CachedInvoiceRow,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$AppSettingsTableTableManager get appSettings =>
      $$AppSettingsTableTableManager(_db, _db.appSettings);
  $$OutboxTableTableManager get outbox =>
      $$OutboxTableTableManager(_db, _db.outbox);
  $$CachedPropertiesTableTableManager get cachedProperties =>
      $$CachedPropertiesTableTableManager(_db, _db.cachedProperties);
  $$CachedUnitsTableTableManager get cachedUnits =>
      $$CachedUnitsTableTableManager(_db, _db.cachedUnits);
  $$CachedTenantsTableTableManager get cachedTenants =>
      $$CachedTenantsTableTableManager(_db, _db.cachedTenants);
  $$CachedLeasesTableTableManager get cachedLeases =>
      $$CachedLeasesTableTableManager(_db, _db.cachedLeases);
  $$CachedInvoicesTableTableManager get cachedInvoices =>
      $$CachedInvoicesTableTableManager(_db, _db.cachedInvoices);
}
