const CertificateModel = require('../model/certificateModel');
const CertificateTemplateModel = require('../model/certificateTemplateModel');

/** Render a certificate to printable HTML using its template design. */
function renderCertificateHTML(template, cert) {
  const data = cert.certificate_data || {};
  const bs = template.background_style || {};
  const titleStyle = template.certificate_title_style || {};
  const apprec = template.appreciation_text_style || {};
  const sigStyle = template.signature_style || {};

  let background = 'background: #ffffff;';
  if (bs.type === 'image' && template.background_image) {
    background = `background: url('${template.background_image}') center/cover no-repeat;`;
  } else if (bs.type === 'solid' && bs.solid_color) {
    background = `background: ${bs.solid_color};`;
  } else if (bs.type === 'gradient' && Array.isArray(bs.gradient_colors) && bs.gradient_colors.length === 2) {
    const dir = bs.gradient_direction || 'horizontal';
    const angle = dir === 'vertical' ? '180deg' : dir === 'diagonal' ? '135deg' : '90deg';
    background = `background: linear-gradient(${angle}, ${bs.gradient_colors[0]}, ${bs.gradient_colors[1]});`;
  }
  let border = '';
  if (bs.border_enabled) {
    border = `border: ${bs.border_width || 2}px ${bs.border_style || 'solid'} ${bs.border_color || '#000000'};`;
  }

  // ── Ornamental frame (enhanced design system) ──
  const ornament = bs.ornament || 'none';
  let innerFrame = '';
  if (ornament === 'double' || ornament === 'inset') {
    const inset = ornament === 'double' ? 14 : 10;
    const innerW = bs.inner_border_width || 1;
    const innerC = bs.inner_border_color || bs.border_color || '#000000';
    innerFrame = `<div style="position:absolute;left:${inset}px;top:${inset}px;right:${inset}px;bottom:${inset}px;border:${innerW}px solid ${innerC};pointer-events:none;"></div>`;
  }
  // Decorative corner flourishes
  let corners = '';
  if (bs.corner_ornament) {
    const c = bs.inner_border_color || bs.border_color || '#000000';
    const corner = `<div style="width:28px;height:28px;border-top:3px solid ${c};border-left:3px solid ${c};"></div>`;
    corners = `<div style="position:absolute;left:10px;top:10px;">${corner}</div>
      <div style="position:absolute;right:10px;top:10px;transform:rotate(90deg);">${corner}</div>
      <div style="position:absolute;right:10px;bottom:10px;transform:rotate(180deg);">${corner}</div>
      <div style="position:absolute;left:10px;bottom:10px;transform:rotate(270deg);">${corner}</div>`;
  }
  // Circular seal
  let seal = '';
  if (bs.seal && bs.seal.enabled) {
    const sc = bs.seal.color || bs.border_color || '#000000';
    const sx = bs.seal.x || 85, sy = bs.seal.y || 85;
    const st = bs.seal.text || '★';
    seal = `<div style="position:absolute;left:${sx}%;top:${sy}%;transform:translate(-50%,-50%);width:86px;height:86px;border-radius:50%;border:3px double ${sc};display:flex;align-items:center;justify-content:center;color:${sc};font-family:Georgia,serif;font-size:${st.length > 4 ? 11 : 22}px;font-weight:bold;letter-spacing:1px;opacity:0.9;">${st}</div>`;
  }
  // Watermark
  let watermark = '';
  if (bs.watermark && bs.watermark.enabled) {
    const wc = bs.watermark.color || '#000000';
    const wo = bs.watermark.opacity != null ? bs.watermark.opacity : 0.04;
    watermark = `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:Georgia,serif;font-size:170px;font-weight:bold;color:${wc};opacity:${wo};white-space:nowrap;pointer-events:none;user-select:none;">${bs.watermark.text || 'NIBOG'}</div>`;
  }

  const dims = template.paper_size === 'a3' ? { w: 1123, h: 794 } : template.paper_size === 'letter' ? { w: 1056, h: 816 } : { w: 842, h: 595 };
  const page = template.orientation === 'portrait' ? { w: dims.h, h: dims.w } : dims;

  const replaceVars = (text) => String(text || '')
    .replace(/\{participant_name\}/g, data.participant_name || cert.participant_name || '')
    .replace(/\{event_name\}/g, data.event_name || cert.event_title || '')
    .replace(/\{event_date\}/g, data.event_date || '')
    .replace(/\{venue_name\}/g, data.venue_name || '')
    .replace(/\{city_name\}/g, data.city_name || '')
    .replace(/\{certificate_number\}/g, cert.certificate_number || '')
    .replace(/\{game_name\}/g, data.game_name || '')
    .replace(/\{parent_name\}/g, data.parent_name || '');

  const fieldValues = {
    participant_name: data.participant_name || cert.participant_name || '',
    event_name: data.event_name || cert.event_title || '',
    event_date: data.event_date || '',
    venue_name: data.venue_name || '',
    city_name: data.city_name || '',
    certificate_number: cert.certificate_number || '',
    game_name: data.game_name || '',
    parent_name: data.parent_name || '',
    signature: (sigStyle.signature_type === 'image' && template.signature_image) ? `<img src="${template.signature_image}" style="height:60px;object-fit:contain;" alt="signature" />` : (sigStyle.text || 'Authorized Signature')
  };

  const fieldsHtml = (template.fields || []).map(f => {
    const value = fieldValues[f.name] !== undefined ? fieldValues[f.name] : (f.name ? replaceVars(`{${f.name}}`) : '');
    return `<div style="position:absolute;left:${f.x || 50}%;top:${f.y || 50}%;transform:translate(-50%,-50%);width:${f.max_width || 60}%;text-align:${f.alignment || 'center'};font-family:${f.font_family || 'Arial'};font-size:${f.font_size || 16}px;font-weight:${f.font_weight || 'normal'};color:${f.color || '#000000'};white-space:${f.name === 'participant_name' ? 'nowrap' : 'pre-wrap'};">${value}</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Certificate ${cert.certificate_number || cert.id}</title></head>
<body style="margin:0;padding:0;">
<div style="position:relative;width:${page.w}px;height:${page.h}px;${background}${border}overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
  ${watermark}
  ${innerFrame}
  ${corners}
  <div style="position:absolute;left:${titleStyle.x || 50}%;top:${titleStyle.y || 15}%;transform:translate(-50%,-50%);width:${titleStyle.max_width || 80}%;text-align:${titleStyle.alignment || 'center'};font-family:${titleStyle.font_family || 'Arial'};font-size:${titleStyle.font_size || 36}px;font-weight:${titleStyle.font_weight || 'bold'};color:${titleStyle.color || '#000000'};${titleStyle.letter_spacing ? `letter-spacing:${titleStyle.letter_spacing}px;` : ''}${titleStyle.text_transform ? `text-transform:${titleStyle.text_transform};` : ''}">${replaceVars(template.certificate_title || 'Certificate of Participation')}</div>
  ${(apprec.text || template.appreciation_text) ? `<div style="position:absolute;left:${apprec.x || 50}%;top:${apprec.y || 40}%;transform:translate(-50%,-50%);width:${apprec.max_width || 70}%;text-align:${apprec.alignment || 'center'};font-family:${apprec.font_family || 'Arial'};font-size:${apprec.font_size || 16}px;${apprec.font_style ? `font-style:${apprec.font_style};` : ''}color:${apprec.color || '#333333'};">${replaceVars(apprec.text || template.appreciation_text || '')}</div>` : ''}
  ${fieldsHtml}
  <div style="position:absolute;left:${sigStyle.x || 80}%;top:${sigStyle.y || 85}%;transform:translate(-50%,-50%);text-align:center;font-family:${sigStyle.font_family || 'Arial'};font-size:${sigStyle.font_size || 14}px;color:${sigStyle.color || '#333'};">${fieldValues.signature}<div style="width:140px;border-top:1px solid ${sigStyle.color || '#333'};margin-top:4px;"></div></div>
  ${seal}
</div>
</body></html>`;
}

exports.generateSingle = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.template_id || !data.event_id) {
      return res.status(400).json({ error: 'template_id and event_id are required' });
    }
    const template = await CertificateTemplateModel.getById(data.template_id);
    if (!template) return res.status(404).json({ error: 'Certificate template not found' });
    const cert = await CertificateModel.generate(data);
    res.status(201).json([cert]);
  } catch (err) {
    console.error('cert generateSingle:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { event_id, search, status, template_id, limit, offset } = req.query;
    const certs = await CertificateModel.list({
      eventId: event_id, search, status, templateId: template_id,
      limit: limit || 500, offset: offset || 0
    });
    res.json(certs);
  } catch (err) {
    console.error('cert getAll:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getSingle = async (req, res) => {
  try {
    const { certificate_id } = req.body || {};
    if (!certificate_id) return res.status(400).json({ error: 'certificate_id is required' });
    const cert = await CertificateModel.getById(certificate_id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    res.json([cert]);
  } catch (err) {
    console.error('cert getSingle:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.download = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await CertificateModel.getById(id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    const template = await CertificateTemplateModel.getById(cert.template_id);
    const html = renderCertificateHTML(template || { fields: [] }, cert);
    await CertificateModel.markStatus(id, 'downloaded').catch(() => {});
    const filename = `certificate_${cert.certificate_number || cert.id}.html`;
    res.json([{ html, certificate_id: cert.id, filename, pdf_path: filename, full_path: filename }]);
  } catch (err) {
    console.error('cert download:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.eventParticipants = async (req, res) => {
  try {
    const eventId = req.query.event_id || req.params.event_id;
    if (!eventId) return res.status(400).json({ error: 'event_id is required' });
    const rows = await CertificateModel.eventParticipants(eventId);
    const [evRows] = await require('../config/config').promisePool.query(
      `SELECT e.id, e.title, e.event_date, v.venue_name, c.city_name
       FROM events e LEFT JOIN venues v ON e.venue_id = v.id LEFT JOIN cities c ON e.city_id = c.id
       WHERE e.id = ? LIMIT 1`, [eventId]);
    const ev = evRows[0] || {};
    res.json({
      event_id: Number(eventId),
      event_name: ev.title || '',
      event_title: ev.title || '',
      event_date: ev.event_date || '',
      venue_name: ev.venue_name || '',
      city_name: ev.city_name || '',
      total_participants: rows.length,
      participants: rows
    });
  } catch (err) {
    console.error('cert eventParticipants:', err.message);
    res.status(500).json({ error: err.message });
  }
};
