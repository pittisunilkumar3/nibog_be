// WhatsApp Meta Cloud API — config, verify, send, webhook
const pool = require('../config/config').promisePool;

const GRAPH = 'https://graph.facebook.com';
const maskToken = (t) => (t ? t.slice(0, 6) + '••••••••' + t.slice(-4) : '');

async function getConfig() {
  const [rows] = await pool.query('SELECT * FROM whatsapp_meta_config ORDER BY id LIMIT 1');
  return rows[0] || null;
}

// GET /api/whatsapp-meta/settings
exports.getSettings = async (req, res) => {
  try {
    const c = await getConfig();
    if (!c) return res.json({ configured: false, settings: null });
    res.json({
      configured: true,
      settings: {
        phone_number_id: c.phone_number_id,
        waba_id: c.waba_id,
        api_version: c.api_version,
        verify_token: c.verify_token,
        is_active: !!c.is_active,
        access_token_masked: maskToken(c.access_token),
        has_access_token: !!c.access_token,
        updated_at: c.updated_at,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/whatsapp-meta/settings
exports.saveSettings = async (req, res) => {
  try {
    const { phone_number_id, waba_id, access_token, api_version, verify_token, is_active } = req.body || {};
    if (!phone_number_id) return res.status(400).json({ error: 'phone_number_id is required' });
    if (!access_token) {
      const existing = await getConfig();
      if (!existing || !existing.access_token) return res.status(400).json({ error: 'access_token is required' });
    }
    const ver = (api_version || 'v21.0').trim();
    const vt = (verify_token && String(verify_token).trim()) || ('nibog-' + Math.random().toString(36).slice(2, 12));
    const active = is_active === false || is_active === 0 || is_active === 'false' ? 0 : 1;
    const existing = await getConfig();
    const values = [String(phone_number_id).trim(), String(waba_id || '').trim(), String(access_token || '').trim(), ver, vt, active];
    if (existing) {
      await pool.query(
        `UPDATE whatsapp_meta_config SET phone_number_id=?, waba_id=?, api_version=?, verify_token=?, is_active=?` +
        (String(access_token || '').trim() ? ', access_token=?' : '') + ' WHERE id=?',
        (String(access_token || '').trim() ? [phone_number_id, waba_id, ver, vt, active, access_token, existing.id]
                                           : [phone_number_id, waba_id, ver, vt, active, existing.id])
      );
    } else {
      await pool.query(
        'INSERT INTO whatsapp_meta_config (phone_number_id, waba_id, access_token, api_version, verify_token, is_active) VALUES (?,?,?,?,?,?)',
        values
      );
    }
    res.json({ success: true, message: 'WhatsApp Meta configuration saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/whatsapp-meta/verify — validate credentials against Graph API
exports.verify = async (req, res) => {
  try {
    const body = req.body || {};
    const c = await getConfig();
    const token = (body.access_token && String(body.access_token).trim()) || (c && c.access_token);
    const phoneId = (body.phone_number_id && String(body.phone_number_id).trim()) || (c && c.phone_number_id);
    const ver = (body.api_version && String(body.api_version).trim()) || (c && c.api_version) || 'v21.0';
    if (!token || !phoneId) return res.status(400).json({ error: 'Save the config first (or send access_token + phone_number_id)' });
    const r = await fetch(`${GRAPH}/${ver}/${phoneId}?access_token=${encodeURIComponent(token)}`);
    const j = await r.json();
    if (!r.ok) return res.status(400).json({ error: j?.error?.message || 'Verification failed', details: j });
    res.json({
      success: true,
      message: 'Connected to Meta ✓',
      phone_number: j.display_phone_number || '',
      verified_name: j.verified_name || '',
      quality_rating: j.quality_rating || '',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/whatsapp-meta/send-test  {to, message}
exports.sendTest = async (req, res) => {
  try {
    const { to, message } = req.body || {};
    if (!to) return res.status(400).json({ error: 'to (phone number) is required' });
    const c = await getConfig();
    if (!c || !c.access_token || !c.phone_number_id) return res.status(400).json({ error: 'WhatsApp Meta is not configured' });
    const ver = c.api_version || 'v21.0';
    const r = await fetch(`${GRAPH}/${ver}/${c.phone_number_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/[^0-9]/g, ''), type: 'text', text: { body: message || 'Hello from NIBOG! WhatsApp Meta connection works 🎉' } }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(400).json({ error: j?.error?.message || 'Send failed', details: j });
    res.json({ success: true, message_id: j.messages?.[0]?.id, note: 'Sent. Note: Meta allows free-form text only within the 24h customer window — for business-initiated messages use an approved template.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Reusable: send an approved TEMPLATE message
exports.sendTemplateMessage = async (to, template, language = 'en', components = []) => {
  const c = await getConfig();
  if (!c || !c.access_token || !c.phone_number_id) throw new Error('WhatsApp Meta is not configured');
  const ver = c.api_version || 'v21.0';
  const r = await fetch(`${GRAPH}/${ver}/${c.phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: String(to).replace(/[^0-9]/g, ''),
      type: 'template', template: { name: template, language: { code: language }, components },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Template send failed');
  return j;
};

// GET /api/whatsapp-meta/webhook — Meta verification handshake
exports.verifyWebhook = async (req, res) => {
  const c = await getConfig();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && c && token === c.verify_token) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// POST /api/whatsapp-meta/webhook — delivery statuses / incoming
exports.webhook = async (req, res) => {
  try {
    const body = req.body || {};
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const statuses = change.value?.statuses || [];
        for (const st of statuses) {
          console.log(`[wa-meta] msg ${st.id} -> ${st.status}${st.errors?.[0]?.title ? ' (' + st.errors[0].title + ')' : ''}`);
        }
        const msgs = change.value?.messages || [];
        for (const m of msgs) console.log(`[wa-meta] incoming from ${m.from}: ${m.text?.body || m.type}`);
      }
    }
    res.sendStatus(200);
  } catch (e) { res.sendStatus(200); }
};
