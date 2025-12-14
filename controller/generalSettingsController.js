const GeneralSettingsModel = require('../model/generalSettingsModel');

// Get general settings
const getSettings = async (req, res) => {
  try {
    const settings = await GeneralSettingsModel.get();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching settings', error: err.message });
  }
};

// Update general settings
const updateSettings = async (req, res) => {
  try {
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No data provided' });
    }
    await GeneralSettingsModel.update(data);
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating settings', error: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
};