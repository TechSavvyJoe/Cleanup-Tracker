import { json } from '../_lib/db';

export function onRequest() {
  return json({ ok: true });
}
