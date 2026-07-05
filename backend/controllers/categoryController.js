const Category = require('../models/Category');

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ userId: req.user.id });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, emoji, color, parentId, type } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide category name.' });
    }

    const newCategory = await Category.create({
      userId: req.user.id,
      name,
      emoji: emoji || '',
      color: color || '#94a3b8',
      parentId: parentId || null,
      type: type || 'EXPENSE'
    });

    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name, emoji, color, parentId, type } = req.body;
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found or access denied.' });
    }

    if (name) category.name = name;
    if (emoji !== undefined) category.emoji = emoji;
    if (color) category.color = color;
    if (parentId !== undefined) category.parentId = parentId || null;
    if (type) category.type = type;

    await category.save();
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found or access denied.' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
