// WhatsApp Meta template management — submit/approve/sync/delete (like smartcampus Whatsappgateway)
const pool = require('../config/config').promisePool;
const GRAPH = 'https://graph.facebook.com';

async function getConfig() {
  const [rows] = await pool.query('SELECT * FROM whatsapp_meta_config ORDER BY id LIMIT 1');
  return rows[0] || null;
}
const graph = async (url, options = {}) => {
  const r = await fetch(url, options);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
};
const buildComponents = (header_text, body_text, footer_text) => {
  const components = [];
  if (header_text && header_text.trim()) {
    components.push({ type: 'HEADER', format: 'TEXT', text: header_text.trim().slice(0, 60) });
  }
  const vars = [...new Set((body_text.match(/\{\{(\d+)\}\}/g) || []))];
  const bodyComp = { type: 'BODY', text: body_text };
  if (vars.length) {
    bodyComp.example = { body_text: [vars.map((_, i) => `Example ${i + 1}`)] };
  }
  components.push(bodyComp);
  if (footer_text && footer_text.trim()) {
    components.push({ type: 'FOOTER', text: footer_text.trim().slice(0, 60) });
  }
  return { components, varCount: vars.length };
};

// GET /api/whatsapp-meta/templates
exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM whatsapp_templates ORDER BY updated_at DESC');
    res.json({ templates: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/whatsapp-meta/templates/submit  {id?, template_name, language, category, header_text, body_text, footer_text}
exports.submit = async (req, res) => {
  try {
    const { id, template_name, language = 'en', category = 'UTILITY', header_text = '', body_text, footer_text = '' } = req.body || {};
    const name = String(template_name || '').trim();
    if (!/^[a-z0-9_]+$/.test(name)) return res.status(400).json({ error: 'Template name must be lowercase letters, numbers and underscores only (e.g. booking_confirmation)' });
    if (!body_text || !String(body_text).trim()) return res.status(400).json({ error: 'Body text is required' });
    const cfg = await getConfig();
    if (!cfg || !cfg.access_token) return res.status(400).json({ error: 'Save your Meta access token in WhatsApp settings first' });
    if (!cfg.waba_id) return res.status(400).json({ error: 'WhatsApp Business Account ID (WABA) missing — add it in WhatsApp settings' });
    const ver = cfg.api_version || 'v21.0';
    const { components } = buildComponents(header_text, body_text, footer_text);

    // find existing on Meta by name — UPDATE if exists (Meta blocks delete+recreate for 4 weeks)
    const find = await graph(`${GRAPH}/${ver}/${cfg.waba_id}/message_templates?name=${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${cfg.access_token}` },
    });
    if (!find.ok && find.j?.error) return res.status(400).json({ error: find.j.error.message });

    let metaId, status;
    if (find.j.data && find.j.data.length) {
      metaId = find.j.data[0].id;
      const up = await graph(`${GRAPH}/${ver}/${metaId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category.toUpperCase(), components }),
      });
      if (!up.ok) return res.status(400).json({ error: up.j?.error?.message || 'Update failed' });
      status = 'PENDING';
    } else {
      const cr = await graph(`${GRAPH}/${ver}/${cfg.waba_id}/message_templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, language: language || 'en', category: category.toUpperCase(), allow_category_change: true, components }),
      });
      if (!cr.ok) return res.status(400).json({ error: cr.j?.error?.message || 'Submission to Meta failed' });
      metaId = cr.j.id;
      status = cr.j.status || 'PENDING';
    }

    if (id) {
      await pool.query(
        'UPDATE whatsapp_templates SET template_name=?, language=?, category=?, status=?, rejected_reason=NULL, header_text=?, body_text=?, footer_text=?, meta_template_id=?, meta_components=? WHERE id=?',
        [name, language, category.toUpperCase(), status, header_text, body_text, footer_text, metaId, JSON.stringify(components), id]
      );
    } else {
      await pool.query(
        'INSERT INTO whatsapp_templates (template_name, language, category, status, header_text, body_text, footer_text, meta_template_id, meta_components) VALUES (?,?,?,?,?,?,?,?,?)',
        [name, language, category.toUpperCase(), status, header_text, body_text, footer_text, metaId, JSON.stringify(components)]
      );
    }
    res.json({ success: true, status, meta_template_id: metaId, message: `"${name}" ${find.j.data && find.j.data.length ? 'updated' : 'submitted'} on Meta — status: ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/whatsapp-meta/templates/sync-all — mirror everything from Meta
exports.syncAll = async (req, res) => {
  try {
    const cfg = await getConfig();
    if (!cfg || !cfg.access_token || !cfg.waba_id) return res.status(400).json({ error: 'Meta config (token + WABA ID) required' });
    const ver = cfg.api_version || 'v21.0';
    const r = await graph(`${GRAPH}/${ver}/${cfg.waba_id}/message_templates?fields=id,name,status,language,category,components&limit=200`, {
      headers: { Authorization: `Bearer ${cfg.access_token}` },
    });
    if (!r.ok) return res.status(400).json({ error: r.j?.error?.message || 'Sync failed' });
    let updated = 0, imported = 0;
    for (const t of r.j.data || []) {
      if (!t.name) continue;
      let body = '', header = '', footer = '';
      for (const c of t.components || []) {
        if (c.type === 'BODY') body = c.text || '';
        if (c.type === 'HEADER') header = c.text || '';
        if (c.type === 'FOOTER') footer = c.text || '';
      }
      const [rows] = await pool.query('SELECT id FROM whatsapp_templates WHERE template_name=? LIMIT 1', [t.name]);
      if (rows.length) {
        await pool.query(
          'UPDATE whatsapp_templates SET status=?, language=?, category=?, meta_template_id=?, header_text=?, body_text=?, footer_text=?, rejected_reason=NULL, meta_components=? WHERE id=?',
          [t.status, t.language || 'en', t.category || 'UTILITY', t.id, header, body, footer, JSON.stringify(t.components || []), rows[0].id]
        );
        updated++;
      } else {
        await pool.query(
          'INSERT INTO whatsapp_templates (template_name, language, category, status, header_text, body_text, footer_text, meta_template_id, meta_components) VALUES (?,?,?,?,?,?,?,?,?)',
          [t.name, t.language || 'en', t.category || 'UTILITY', t.status, header, body, footer, t.id, JSON.stringify(t.components || [])]
        );
        imported++;
      }
    }
    res.json({ success: true, message: `Synced — ${updated} updated, ${imported} imported from Meta`, total_on_meta: (r.j.data || []).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/whatsapp-meta/templates/:id/sync
exports.syncOne = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM whatsapp_templates WHERE id=? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    const t = rows[0];
    const cfg = await getConfig();
    if (!cfg || !cfg.access_token || !cfg.waba_id) return res.status(400).json({ error: 'Meta config required' });
    const ver = cfg.api_version || 'v21.0';
    const r = await graph(`${GRAPH}/${ver}/${cfg.waba_id}/message_templates?fields=id,name,status,language,quality_score&name=${encodeURIComponent(t.template_name)}`, {
      headers: { Authorization: `Bearer ${cfg.access_token}` },
    });
    if (!r.ok) return res.status(400).json({ error: r.j?.error?.message || 'Sync failed' });
    const match = (r.j.data || []).find(x => x.language === t.language) || (r.j.data || [])[0];
    if (!match) {
      await pool.query("UPDATE whatsapp_templates SET status='NOT_SUBMITTED', meta_template_id=NULL WHERE id=?", [t.id]);
      return res.json({ success: true, status: 'NOT_SUBMITTED', message: 'Not found on Meta' });
    }
    const reason = match.status === 'REJECTED' ? (match.quality_score?.rejected_reason || '') : null;
    await pool.query('UPDATE whatsapp_templates SET status=?, meta_template_id=?, rejected_reason=? WHERE id=?', [match.status, match.id, reason, t.id]);
    res.json({ success: true, status: match.status, rejected_reason: reason, message: `Status: ${match.status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/whatsapp-meta/templates/:id
exports.remove = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM whatsapp_templates WHERE id=? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    const t = rows[0];
    const cfg = await getConfig();
    if (cfg && cfg.access_token && cfg.waba_id) {
      const ver = cfg.api_version || 'v21.0';
      await graph(`${GRAPH}/${ver}/${cfg.waba_id}/message_templates?name=${encodeURIComponent(t.template_name)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${cfg.access_token}` },
      });
    }
    await pool.query('DELETE FROM whatsapp_templates WHERE id=?', [t.id]);
    res.json({ success: true, message: `"${t.template_name}" deleted` });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
