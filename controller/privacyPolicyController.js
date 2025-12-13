// controller/privacyPolicyController.js
const PrivacyPolicyModel = require('../model/PrivacyPolicyModel');

exports.getPrivacyPolicy = async (req, res) => {
  try {
    const policy = await PrivacyPolicyModel.getPolicy();
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Privacy policy not found' });
    }
    res.json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching privacy policy', error: error.message });
  }
};

exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const { policy_text } = req.body;
    if (!policy_text) {
      return res.status(400).json({ success: false, message: 'policy_text is required' });
    }
    await PrivacyPolicyModel.updatePolicy(policy_text);
    res.json({ success: true, message: 'Privacy policy updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating privacy policy', error: error.message });
  }
};
