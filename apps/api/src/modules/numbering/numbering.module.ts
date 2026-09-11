import { Global, Module } from '@nestjs/common';
import { NumberingService } from './application/numbering.service';

/**
 * Module `numbering` : table `sequences` et fonctions SQL `next_sequence`
 * / `format_sequence_number`.
 *
 * `@Global()` parce que la numérotation est transverse : les baux (phase 2),
 * les factures et les quittances (phase 3), les relevés de gérance (phase 7)
 * s'en servent tous. L'importer dans chaque module ne dirait rien de plus et
 * multiplierait les imports croisés.
 *
 * Le module n'expose aucune route : un numéro n'a de sens qu'attaché à
 * l'objet qu'il numérote, dans la transaction qui le crée.
 */
@Global()
@Module({
  providers: [NumberingService],
  exports: [NumberingService],
})
export class NumberingModule {}
