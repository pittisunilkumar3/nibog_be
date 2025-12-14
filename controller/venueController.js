const VenueModel = require('../model/venueModel');

// List all venues
const listVenues = async (req, res) => {
  try {
    const venues = await VenueModel.list();
    res.json(venues);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching venues', error: err.message });
  }
};

// Get a single venue by id
const getVenue = async (req, res) => {
  try {
    const id = req.params.id;
    const venue = await VenueModel.get(id);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching venue', error: err.message });
  }
};

// Create a new venue
const createVenue = async (req, res) => {
  try {
    const { venue_name, address, city_id, capacity, is_active } = req.body;
    if (!venue_name || !address || !city_id) return res.status(400).json({ message: 'venue_name, address, and city_id are required' });
    await VenueModel.create({ venue_name, address, city_id, capacity, is_active });
    res.json({ message: 'Venue created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating venue', error: err.message });
  }
};

// Update a venue
const updateVenue = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    await VenueModel.update(id, data);
    res.json({ message: 'Venue updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating venue', error: err.message });
  }
};

// Delete a venue
const deleteVenue = async (req, res) => {
  try {
    const id = req.params.id;
    await VenueModel.delete(id);
    res.json({ message: 'Venue deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting venue', error: err.message });
  }
};

module.exports = {
  listVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue
};
