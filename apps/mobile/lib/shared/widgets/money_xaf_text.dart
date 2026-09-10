import 'package:flutter/material.dart';

import '../../core/format/money_xaf.dart';

/// Affiche un montant XAF formaté (entier, séparateur de milliers, suffixe
/// « FCFA »), sans jamais afficher de décimales.
class MoneyXafText extends StatelessWidget {
  const MoneyXafText(this.amountXaf, {super.key, this.style});

  final int amountXaf;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Text(formatXaf(amountXaf), style: style);
  }
}
