const HomepageSectionsModel = require('../model/homepageSectionsModel');

const HomepageSectionsController = {
  async list(req, res) {
    const sections = await HomepageSectionsModel.list();
    res.json({ success: true, data: sections });
  },
  async get(req, res) {
    const section = await HomepageSectionsModel.get(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, data: section });
  },
  async create(req, res) {
    const { image_path, priority, status } = req.body;
    if (!image_path) return res.status(400).json({ success: false, message: 'image_path is required' });
    const section = await HomepageSectionsModel.create({ image_path, priority, status });
    res.status(201).json({ success: true, data: section });
  },
  async update(req, res) {
    const { image_path, priority, status } = req.body;
    const updated = await HomepageSectionsModel.update(req.params.id, { image_path, priority, status });
    if (!updated) return res.status(404).json({ success: false, message: 'Section not found or no changes' });
    res.json({ success: true, message: 'Section updated' });
  },
  async remove(req, res) {
    const deleted = await HomepageSectionsModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, message: 'Section deleted' });
  }
};

module.exports = HomepageSectionsController;
