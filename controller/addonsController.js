const AddonsModel = require('../model/addonsModel');

// List all addons
const listAddons = async (req, res) => {
    try {
        const addons = await AddonsModel.getAll();
        res.json(addons);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching addons', error: err.message });
    }
};

// Get a single addon by id
const getAddonById = async (req, res) => {
    try {
        const id = req.params.id;
        const addon = await AddonsModel.getById(id);
        if (!addon) return res.status(404).json({ message: 'Addon not found' });
        res.json(addon);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching addon', error: err.message });
    }
};

// Create a new addon
const createAddon = async (req, res) => {
    try {
        const { name, description, price, category, is_active, has_variants, stock_quantity, sku, bundle_min_quantity, bundle_discount_percentage, image_url } = req.body;

        // Basic validation
        if (!name || !price) {
            return res.status(400).json({ message: 'Name and price are required' });
        }

        const newAddon = await AddonsModel.create({
            name, description, price, category, is_active, has_variants, stock_quantity, sku, bundle_min_quantity, bundle_discount_percentage, image_url
        });

        res.status(201).json({ message: 'Addon created successfully', addon: newAddon });
    } catch (err) {
        res.status(500).json({ message: 'Error creating addon', error: err.message });
    }
};

// Update an addon
const updateAddon = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        // Check if addon exists first (optional, but good practice if model update doesn't handle it explicitly)
        const existing = await AddonsModel.getById(id);
        if (!existing) return res.status(404).json({ message: 'Addon not found' });

        await AddonsModel.update(id, data);

        // Fetch updated addon to return
        const updatedAddon = await AddonsModel.getById(id);
        res.json({ message: 'Addon updated successfully', addon: updatedAddon });
    } catch (err) {
        res.status(500).json({ message: 'Error updating addon', error: err.message });
    }
};

// Delete an addon
const deleteAddon = async (req, res) => {
    try {
        const id = req.params.id;

        // Check if addon exists
        const existing = await AddonsModel.getById(id);
        if (!existing) return res.status(404).json({ message: 'Addon not found' });

        await AddonsModel.delete(id);
        res.json({ message: 'Addon deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting addon', error: err.message });
    }
};

module.exports = {
    listAddons,
    getAddonById,
    createAddon,
    updateAddon,
    deleteAddon
};
