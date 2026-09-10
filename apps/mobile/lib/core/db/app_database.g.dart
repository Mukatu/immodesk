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

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $AppSettingsTable appSettings = $AppSettingsTable(this);
  late final $OutboxTable outbox = $OutboxTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [appSettings, outbox];
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

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$AppSettingsTableTableManager get appSettings =>
      $$AppSettingsTableTableManager(_db, _db.appSettings);
  $$OutboxTableTableManager get outbox =>
      $$OutboxTableTableManager(_db, _db.outbox);
}
