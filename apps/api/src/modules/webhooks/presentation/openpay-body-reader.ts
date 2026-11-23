import type { IncomingMessage, ServerResponse } from 'node:http';
import { OPENPAY_CALLBACK_MAX_BYTES } from '../../mobile-money/domain/openpay-rules';

type CallbackRequest = IncomingMessage & { rawBody?: Buffer; body?: unknown; _body?: boolean };

/**
 * Lecture du corps du callback OpenPay AVANT l'analyseur JSON global (1 Mo) :
 * limite faible propre à cette route, et aucune erreur d'analyse (un JSON
 * invalide ou un corps trop gros ne doit jamais produire autre chose que
 * `200 {}`, comme toute réponse de cette route). Le corps reste brut : il est
 * analysé, strictement, par `parseTrigger`.
 */
export function openPayCallbackBodyReader(maxBytes: number = OPENPAY_CALLBACK_MAX_BYTES) {
  return (req: CallbackRequest, res: ServerResponse, next: () => void): void => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const reply = (): void => {
      if (settled) return;
      settled = true;
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end('{}');
      res.on('finish', () => req.destroy());
    };
    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) reply();
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      req.rawBody = Buffer.concat(chunks);
      req.body = {};
      // Le body-parser global saute une requête dont le corps est déjà lu.
      req._body = true;
      next();
    });
    req.on('error', reply);
  };
}
