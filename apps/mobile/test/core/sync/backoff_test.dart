import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/sync/sync_engine.dart';

void main() {
  test('repli exponentiel plafonné à cinq minutes', () {
    expect(backoffDelay(0), Duration.zero);
    expect(backoffDelay(1), const Duration(seconds: 5));
    expect(backoffDelay(2), const Duration(seconds: 10));
    expect(backoffDelay(3), const Duration(seconds: 20));
    expect(backoffDelay(4), const Duration(seconds: 40));
    expect(backoffDelay(10), const Duration(minutes: 5));
    expect(backoffDelay(50), const Duration(minutes: 5));
  });
}
