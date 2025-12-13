const FaqModel = require('../model/faqModel');
// Get a single FAQ by id
const getFaq = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Invalid request' });
    }
    const faq = await FaqModel.get(id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    res.json(faq);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching FAQ', error: err.message });
  }
};

// List all FAQs (optionally filter by status/category)
const listFaqs = async (req, res) => {
  try {
    const { status, category } = req.query;
    const faqs = await FaqModel.list({ status, category });
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching FAQs', error: err.message });
  }
};

const editFaq = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    if (!id || !data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Invalid request' });
    }
    await FaqModel.update(id, data);
    res.json({ message: 'FAQ updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating FAQ', error: err.message });
  }
};

const deleteFaq = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Invalid request' });
    }
    await FaqModel.delete(id);
    res.json({ message: 'FAQ deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting FAQ', error: err.message });
  }
};

module.exports = {
  editFaq,
  deleteFaq,
  getFaq,
  listFaqs
};
