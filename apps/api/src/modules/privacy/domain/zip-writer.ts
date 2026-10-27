/**
 * Archive ZIP minimale, écrite à la main : le dépôt n'embarque aucune
 * bibliothèque de compression (`archiver`, `jszip`, `adm-zip`) et cet agent
 * n'a pas le droit d'installer de dépendance. Les exports de la phase 11
 * (réversibilité d'organisation, export d'une personne) doivent pourtant
 * rendre une « archive ZIP contenant un jeu de CSV » (contrat, arbitrage 17).
 *
 * Format PKZIP 2.0, entrées non compressées (méthode STORE) : suffisant pour
 * du CSV texte déjà compact, et évite toute dépendance à `zlib.deflateRaw`
 * pour un gain marginal. Relit sans difficulté par tout lecteur ZIP standard
 * (Explorer, Archive Utility, 7-Zip, `unzip`).
 */

interface ZipEntryInput {
  fileName: string;
  content: Buffer;
}

interface PreparedEntry {
  fileName: string;
  content: Buffer;
  crc32: number;
  localHeaderOffset: number;
}

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

export function crc32(buffer: Buffer): number {
  let crc = 0xff_ff_ff_ff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
}

function dosDateTime(date: Date): { time: number; dateVal: number } {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dateVal =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f);
  return { time, dateVal };
}

/** Construit une archive ZIP (méthode STORE) à partir d'un nom de fichier et d'un contenu pour chaque entrée. */
export function buildZip(entries: readonly ZipEntryInput[], at: Date = new Date()): Buffer {
  const { time, dateVal } = dosDateTime(at);
  const chunks: Buffer[] = [];
  const prepared: PreparedEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.fileName, 'utf8');
    const checksum = crc32(entry.content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04_03_4b_50, 0); // signature locale
    localHeader.writeUInt16LE(20, 4); // version nécessaire
    localHeader.writeUInt16LE(0x0800, 6); // bit 11 : nom de fichier UTF-8
    localHeader.writeUInt16LE(0, 8); // méthode : STORE
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(dateVal, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(entry.content.byteLength, 18);
    localHeader.writeUInt32LE(entry.content.byteLength, 22);
    localHeader.writeUInt16LE(nameBuf.byteLength, 26);
    localHeader.writeUInt16LE(0, 28);

    prepared.push({
      fileName: entry.fileName,
      content: entry.content,
      crc32: checksum,
      localHeaderOffset: offset,
    });
    chunks.push(localHeader, nameBuf, entry.content);
    offset += localHeader.byteLength + nameBuf.byteLength + entry.content.byteLength;
  }

  const centralStart = offset;
  for (const entry of prepared) {
    const nameBuf = Buffer.from(entry.fileName, 'utf8');
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02_01_4b_50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(dateVal, 14);
    central.writeUInt32LE(entry.crc32, 16);
    central.writeUInt32LE(entry.content.byteLength, 20);
    central.writeUInt32LE(entry.content.byteLength, 24);
    central.writeUInt16LE(nameBuf.byteLength, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(entry.localHeaderOffset, 42);
    chunks.push(central, nameBuf);
    offset += central.byteLength + nameBuf.byteLength;
  }
  const centralSize = offset - centralStart;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06_05_4b_50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(prepared.length, 8);
  end.writeUInt16LE(prepared.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  chunks.push(end);

  return Buffer.concat(chunks);
}
