const PartnersModel = require('../model/partnersModel');

const PartnersController = {
  async list(req, res) {
    const partners = await PartnersModel.list();
    res.json({ success: true, data: partners });
  },
  async get(req, res) {
    const partner = await PartnersModel.get(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
    res.json({ success: true, data: partner });
  },
  async create(req, res) {
    const { partner_name, image_url, display_priority, status } = req.body;
    if (!image_url) return res.status(400).json({ success: false, message: 'image_url is required' });
    const partner = await PartnersModel.create({ partner_name, image_url, display_priority, status });
    res.status(201).json({ success: true, data: partner });
  },
  async update(req, res) {
    const { partner_name, image_url, display_priority, status } = req.body;
    const updated = await PartnersModel.update(req.params.id, { partner_name, image_url, display_priority, status });
    if (!updated) return res.status(404).json({ success: false, message: 'Partner not found or no changes' });
    res.json({ success: true, message: 'Partner updated' });
  },
  async remove(req, res) {
    const deleted = await PartnersModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Partner not found' });
    res.json({ success: true, message: 'Partner deleted' });
  }
};

module.exports = PartnersController;
