import UserReport from '../models/UserReport.js';

export const createReport = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.'
      });
    }

    const report = await UserReport.create({
      userId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category: category || 'BUG',
      status: 'RECEIVED'
    });

    res.status(201).json({
      success: true,
      message: 'Report received successfully. Support team will review it.',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReports = async (req, res, next) => {
  try {
    const reports = await UserReport.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};
