// controller/termsController.js
const TermsModel = require('../model/TermsModel');

exports.getTerms = async (req, res) => {
  try {
    const terms = await TermsModel.getTerms();
    if (!terms) {
      return res.status(404).json({ success: false, message: 'Terms and conditions not found' });
    }
    res.json({ success: true, terms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching terms and conditions', error: error.message });
  }
};

exports.updateTerms = async (req, res) => {
  try {
    const { terms_text } = req.body;
    if (!terms_text) {
      return res.status(400).json({ success: false, message: 'terms_text is required' });
    }
    await TermsModel.updateTerms(terms_text);
    res.json({ success: true, message: 'Terms and conditions updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating terms and conditions', error: error.message });
  }
};
