const CertificateTemplateModel = require('../model/certificateTemplateModel');

/**
 * Certificate Template Controller
 * API contract mirrors the frontend service (array responses).
 */

exports.getAll = async (req, res) => {
  try {
    const templates = await CertificateTemplateModel.getAll();
    res.json(templates);
  } catch (err) {
    console.error('cert-template getAll:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    const template = await CertificateTemplateModel.getById(id);
    if (!template) return res.status(404).json({ error: 'Certificate template not found' });
    res.json([template]);
  } catch (err) {
    console.error('cert-template getById:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getByType = async (req, res) => {
  try {
    const { type } = req.params;
    if (!['participation', 'winner', 'event_specific'].includes(type)) {
      return res.status(400).json({ error: 'Invalid template type' });
    }
    const templates = await CertificateTemplateModel.getByType(type);
    res.json(templates);
  } catch (err) {
    console.error('cert-template getByType:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.name || !data.description || !data.type) {
      return res.status(400).json({ error: 'name, description and type are required' });
    }
    const template = await CertificateTemplateModel.create(data);
    res.status(201).json([template]);
  } catch (err) {
    console.error('cert-template create:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.id) return res.status(400).json({ error: 'id is required' });
    const template = await CertificateTemplateModel.update(data);
    if (!template) return res.status(404).json({ error: 'Certificate template not found' });
    res.json([template]);
  } catch (err) {
    console.error('cert-template update:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    const ok = await CertificateTemplateModel.delete(id);
    if (!ok) return res.status(404).json({ error: 'Certificate template not found' });
    res.json({ success: true, message: 'Certificate template deleted successfully' });
  } catch (err) {
    console.error('cert-template delete:', err.message);
    res.status(500).json({ error: err.message });
  }
};
