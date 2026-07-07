import { setCors, handleOptions } from '../_lib/admin.js';

export default function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  res.status(200).json({ ok: true });
}
