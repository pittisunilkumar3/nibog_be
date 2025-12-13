// controller/refundPolicyController.js
const RefundPolicyModel = require('../model/RefundPolicyModel');

exports.getRefundPolicy = async (req, res) => {
  try {
    const policy = await RefundPolicyModel.getPolicy();
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Refund policy not found' });
    }
    res.json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching refund policy', error: error.message });
  }
};

exports.updateRefundPolicy = async (req, res) => {
  try {
    const { policy_text } = req.body;
    if (!policy_text) {
      return res.status(400).json({ success: false, message: 'policy_text is required' });
    }
    await RefundPolicyModel.updatePolicy(policy_text);
    res.json({ success: true, message: 'Refund policy updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating refund policy', error: error.message });
  }
};
