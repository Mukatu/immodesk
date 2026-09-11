import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ContractClauseDto {
  @ApiProperty({ example: 'destination' })
  @IsString()
  @Length(1, 60)
  key!: string;

  @ApiProperty({ example: 'Destination des lieux' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ example: 'Les lieux loués sont destinés exclusivement à l’habitation…' })
  @IsString()
  @Length(1, 4000)
  body!: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  enabled!: boolean;
}

export class ContractTemplateDto {
  @ApiProperty({ example: "CONTRAT DE BAIL À USAGE D'HABITATION" }) headerTitle!: string;
  @ApiProperty() lessorBlock!: string;
  @ApiProperty({ type: [ContractClauseDto] }) optionalClauses!: ContractClauseDto[];
  @ApiProperty() legalMentions!: string;
  @ApiProperty({ example: 'Brazzaville' }) signatureCity!: string;
  @ApiProperty({ description: 'Bloc bail commercial (Acte uniforme OHADA).' })
  showOhadaBlock!: boolean;
  @ApiProperty({ nullable: true, type: String }) footerText!: string | null;
}

/**
 * Modification partielle du gabarit. Chaque champ omis conserve sa valeur
 * courante ; `optionalClauses` est en revanche remplacé en bloc, l'ordre des
 * clauses faisant partie du document.
 */
export class PatchContractTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 200) headerTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) lessorBlock?: string;

  @ApiPropertyOptional({ type: [ContractClauseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractClauseDto)
  optionalClauses?: ContractClauseDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8000) legalMentions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 120) signatureCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showOhadaBlock?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) footerText?: string;
}
