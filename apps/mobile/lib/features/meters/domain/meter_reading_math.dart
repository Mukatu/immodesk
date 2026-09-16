// Calculs purs sur les relevés de compteur (`docs/api/phase8-contract.md`,
// arbitrage 1) : « une consommation ne peut pas être négative ». Un index
// inférieur au précédent n'est jamais enregistré tel quel : soit c'est un
// passage par zéro (compteur revenu à `0` après avoir atteint sa capacité),
// soit c'est une erreur de saisie. Ces fonctions ne décident jamais à la
// place du démarcheur — elles ne font qu'exposer le calcul et la détection.

/// Capacité du compteur (borne supérieure exclusive de l'index), déduite de
/// son nombre de chiffres. Un compteur à 5 chiffres va de `00000` à `99999`
/// puis repasse à `00000` : capacité `100000`.
int meterCapacity(int digitsCount) {
  int capacity = 1;
  for (int i = 0; i < digitsCount; i++) {
    capacity *= 10;
  }
  return capacity;
}

/// Un nouvel index strictement inférieur au précédent est une régression :
/// ni un passage par zéro confirmé, ni une simple progression normale.
bool isIndexRegression({
  required int previousIndex,
  required int currentIndex,
}) {
  return currentIndex < previousIndex;
}

/// Consommation entre deux relevés. Si [rolloverApplied] est vrai (passage
/// par zéro confirmé), la consommation traverse la capacité du compteur :
/// `capacité − index précédent + index courant`. Sinon, différence simple.
/// Ne calcule jamais une valeur négative : c'est au serveur, jamais au
/// mobile, de refuser une régression non confirmée (422
/// `METERS.INDEX_REGRESSION`) — cette fonction sert uniquement à l'aperçu
/// affiché à l'écran avant l'envoi.
int computeConsumption({
  required int previousIndex,
  required int currentIndex,
  required int digitsCount,
  bool rolloverApplied = false,
}) {
  if (rolloverApplied) {
    return meterCapacity(digitsCount) - previousIndex + currentIndex;
  }
  return currentIndex - previousIndex;
}
