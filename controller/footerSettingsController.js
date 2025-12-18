const FooterSettingsModel = require('../model/footerSettingsModel');

// Get footer settings
const getSettings = async (req, res) => {
  try {
    const settings = await FooterSettingsModel.get();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching settings', error: err.message });
  }
};

// Update footer settings
const updateSettings = async (req, res) => {
  try {
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No data provided' });
    }
    await FooterSettingsModel.update(data);
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating settings', error: err.message });
  }
};
// Get footer settings with social links
const getSettingsWithSocialLinks = async (req, res) => {
  try {
    const settings = await FooterSettingsModel.getWithSocialLinks();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching settings with social links', error: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
  ,getSettingsWithSocialLinks
};
