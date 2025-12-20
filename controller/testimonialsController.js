const TestimonialsModel = require('../model/testimonialsModel');

const TestimonialsController = {
  async list(req, res) {
    try {
      const filters = {
        event_id: req.query.event_id,
        city_id: req.query.city_id,
        status: req.query.status
      };
      const testimonials = await TestimonialsModel.list(filters);
      res.json({ success: true, data: testimonials });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async get(req, res) {
    try {
      const id = req.params.id;
      const t = await TestimonialsModel.get(id);
      if (!t) return res.status(404).json({ success: false, message: 'Testimonial not found' });
      res.json({ success: true, data: t });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async create(req, res) {
    try {
      const { name, city_id, event_id, rating, testimonial, submitted_at, status, image_url, priority, is_active } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'name is required' });
      if (rating !== undefined && (rating < 1 || rating > 5)) return res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });

      const id = await TestimonialsModel.create({ name, city_id, event_id, rating, testimonial, submitted_at, status, image_url, priority, is_active });
      res.status(201).json({ success: true, message: 'Testimonial created', id });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async update(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;
      if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) return res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });
      const affected = await TestimonialsModel.update(id, data);
      if (!affected) return res.status(404).json({ success: false, message: 'Testimonial not found or no changes' });
      res.json({ success: true, message: 'Testimonial updated' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async remove(req, res) {
    try {
      const id = req.params.id;
      const affected = await TestimonialsModel.remove(id);
      if (!affected) return res.status(404).json({ success: false, message: 'Testimonial not found' });
      res.json({ success: true, message: 'Testimonial deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = TestimonialsController;
