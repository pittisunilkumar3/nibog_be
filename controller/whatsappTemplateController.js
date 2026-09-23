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
// generate a small sample ticket PDF for Meta template approval
const makeSamplePdf = () => {
  const { jsPDF } = require('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [842, 595] });
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 842, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  doc.text('NIBOG Entry Ticket (Sample)', 60, 55);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.text('This is a sample ticket PDF attached to the booking confirmation message.', 60, 150);
  doc.text('Booking ID: 1234', 60, 190);
  doc.text('Child: Sample Child', 60, 220);
  doc.text('Games: Running Race', 60, 250);
  doc.save('x');
  return Buffer.from(doc.output('arraybuffer'));
};

// resolve Meta app id from token, upload sample, return header_handle
async function uploadSamplePdfHandle(cfg, ver) {
  const d = await graph(`${GRAPH}/${ver}/debug_token?input_token=${encodeURIComponent(cfg.access_token)}`, {
    headers: { Authorization: `Bearer ${cfg.access_token}` },
  });
  const appId = d.j && d.j.data && d.j.data.app_id;
  if (!appId) throw new Error((d.j && d.j.error && d.j.error.message) || 'Could not resolve Meta app id from access token');
  const sample = makeSamplePdf();
  const init = await graph(`${GRAPH}/${ver}/${appId}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_length: sample.length, file_type: 'application/pdf' }),
  });
  if (!init.ok || !init.j || !init.j.upload_url) throw new Error((init.j && init.j.error && init.j.error.message) || 'Meta upload init failed');
  const up = await fetch(init.j.upload_url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.access_token}`, file_offset: '0' },
    body: sample,
  });
  const uj = await up.json().catch(() => ({}));
  if (!up.ok || !uj.h) throw new Error((uj.error && uj.error.message) || 'Meta sample upload failed');
  return uj.h;
}

const buildComponents = async (header_text, body_text, footer_text, header_format = 'text', cfg, ver) => {
  const components = [];
  const hf = String(header_format || 'text').toLowerCase();
  if (hf === 'document') {
    const handle = await uploadSamplePdfHandle(cfg, ver);
    components.push({ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [handle] } });
  } else if (hf === 'image') {
    const handle = await uploadSamplePdfHandle(cfg, ver);
    components.push({ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [handle] } });
  } else if (header_text && header_text.trim()) {
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

const DEFAULT_BOOKING_TEMPLATE = {
  template_name: 'booking_confirmation',
  language: 'en',
  category: 'UTILITY',
  header_format: 'document',
  header_text: 'Booking Confirmed',
  body_text: 'Hi {{1}}, your booking for {{2}} has been confirmed! \n\nBooking ID: {{3}}\nGames: {{4}}\nVenue: {{5}}\n\nYour entry ticket is attached as PDF. Please show it at the entry!',
  footer_text: '- Team NIBOG',
};

async function ensureDefaultTemplate() {
  try {
    const [rows] = await pool.query('SELECT id FROM whatsapp_templates WHERE is_default = 1 LIMIT 1');
    if (rows.length) return;
    await pool.query(
      'INSERT INTO whatsapp_templates (template_name, language, category, status, header_format, header_text, body_text, footer_text, is_default) VALUES (?,?,?,?,?,?,?,?,1)',
      [DEFAULT_BOOKING_TEMPLATE.template_name, DEFAULT_BOOKING_TEMPLATE.language, DEFAULT_BOOKING_TEMPLATE.category, 'NOT_SUBMITTED', DEFAULT_BOOKING_TEMPLATE.header_format, DEFAULT_BOOKING_TEMPLATE.header_text, DEFAULT_BOOKING_TEMPLATE.body_text, DEFAULT_BOOKING_TEMPLATE.footer_text]
    );
  } catch (e) { console.error('ensureDefaultTemplate:', e.message); }
}

// GET /api/whatsapp-meta/templates
exports.list = async (req, res) => {
  try {
    await ensureDefaultTemplate();
    const [rows] = await pool.query('SELECT * FROM whatsapp_templates ORDER BY updated_at DESC');
    res.json({ templates: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/whatsapp-meta/templates/submit  {id?, template_name, language, category, header_text, body_text, footer_text}
exports.submit = async (req, res) => {
  try {
    const { id, template_name, language = 'en', category = 'UTILITY', header_text = '', body_text, footer_text = '', header_format = 'text' } = req.body || {};
    const name = String(template_name || '').trim();
    if (!/^[a-z0-9_]+$/.test(name)) return res.status(400).json({ error: 'Template name must be lowercase letters, numbers and underscores only (e.g. booking_confirmation)' });
    if (!body_text || !String(body_text).trim()) return res.status(400).json({ error: 'Body text is required' });
    const cfg = await getConfig();
    if (!cfg || !cfg.access_token) return res.status(400).json({ error: 'Save your Meta access token in WhatsApp settings first' });
    if (!cfg.waba_id) return res.status(400).json({ error: 'WhatsApp Business Account ID (WABA) missing — add it in WhatsApp settings' });
    const ver = cfg.api_version || 'v21.0';

    // convert named variables {{parent_name}} -> {{1}}, {{2}}... (Meta numbering)
    // and remember the ordered names so sends can map values by position
    let metaBody = String(body_text);
    const seen = new Set();
    const orderedVars = [];
    for (const m of metaBody.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g)) {
      if (!seen.has(m[1])) { seen.add(m[1]); orderedVars.push(m[1]); }
    }
    for (const name of orderedVars) {
      metaBody = metaBody.split(`{{${name}}}`).join(`{{${orderedVars.indexOf(name) + 1}}}`);
    }
    const bodyVarsJson = orderedVars.length ? JSON.stringify(orderedVars) : null;

    const components = await buildComponents(header_text, metaBody, footer_text, header_format, cfg, ver);
    const body_text_out = metaBody;

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
        'UPDATE whatsapp_templates SET template_name=?, language=?, category=?, status=?, rejected_reason=NULL, header_format=?, header_text=?, body_text=?, footer_text=?, body_variables=?, meta_template_id=?, meta_components=? WHERE id=?',
        [name, language, category.toUpperCase(), status, String(header_format).toLowerCase(), header_text, body_text_out, footer_text, bodyVarsJson, metaId, JSON.stringify(components), id]
      );
    } else {
      await pool.query(
        'INSERT INTO whatsapp_templates (template_name, language, category, status, header_format, header_text, body_text, footer_text, body_variables, meta_template_id, meta_components) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [name, language, category.toUpperCase(), status, String(header_format).toLowerCase(), header_text, body_text_out, footer_text, bodyVarsJson, metaId, JSON.stringify(components)]
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
    if (t.is_default) return res.status(400).json({ error: 'The default booking template cannot be deleted — you can edit it instead' });
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
