const CityModel = require('../model/cityModel');

// List all events for a city
const getEventsByCity = async (req, res) => {
  try {
    const cityId = req.params.id;
    const events = await CityModel.getEventsByCity(cityId);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching events for city', error: err.message });
  }
};

// List all cities with their venues and total venues
const listCitiesWithVenues = async (req, res) => {
  try {
    const cities = await CityModel.listWithVenues();
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching cities with venues', error: err.message });
  }
};


// List all cities
const listCities = async (req, res) => {
  try {
    const cities = await CityModel.list();
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching cities', error: err.message });
  }
};

// Get a single city by id
const getCity = async (req, res) => {
  try {
    const id = req.params.id;
    const city = await CityModel.get(id);
    if (!city) return res.status(404).json({ message: 'City not found' });
    res.json(city);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching city', error: err.message });
  }
};

// Create a new city
const createCity = async (req, res) => {
  try {
    const { city_name, state, is_active } = req.body;
    if (!city_name || !state) return res.status(400).json({ message: 'city_name and state are required' });
    await CityModel.create({ city_name, state, is_active });
    res.json({ message: 'City created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating city', error: err.message });
  }
};

// Update a city
const updateCity = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    await CityModel.update(id, data);
    res.json({ message: 'City updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating city', error: err.message });
  }
};

// Delete a city
const deleteCity = async (req, res) => {
  try {
    const id = req.params.id;
    await CityModel.delete(id);
    res.json({ message: 'City deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting city', error: err.message });
  }
};

module.exports = {
  listCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
  listCitiesWithVenues,
  getEventsByCity
};
