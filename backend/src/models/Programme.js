const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name:            { type: String, required: true },
  startWeek:       { type: Number, default: 0, min: 0 },
  durationWeeks:   { type: Number, default: 1, min: 1 },
  percentComplete: { type: Number, default: 0, min: 0, max: 100 },
}, { _id: true });

const phaseSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  color:      { type: String, default: '#1e3a5f' },
  activities: [activitySchema],
}, { _id: true });

const weeklyReportSchema = new mongoose.Schema({
  weekNumber:      { type: Number, required: true },
  weekEnding:      { type: Date },
  overallPlanned:  { type: Number, default: 0 },
  overallActual:   { type: Number, default: 0 },
  phaseProgress:   [{ phase: String, planned: Number, actual: Number }],
  lookAhead:       { type: String, trim: true },
  issues:          { type: String, trim: true },
  signedOffBy:     { type: String, trim: true },
  signedOffAt:     { type: Date },
}, { timestamps: true });

const programmeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name:      { type: String, default: 'Construction Programme' },
  startDate: { type: Date, required: true },
  phases:    [phaseSchema],
  weeklyReports: [weeklyReportSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Programme', programmeSchema);
