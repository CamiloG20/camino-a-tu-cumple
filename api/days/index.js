import { getAdminSupabase, requireAdmin, setCors, handleOptions } from '../_lib/admin.js';

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .order('day_number', { ascending: false });

    if (error) throw error;
    return res.status(200).json(data ?? []);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al cargar días' });
  }
}
