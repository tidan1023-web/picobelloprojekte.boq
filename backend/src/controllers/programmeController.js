const Programme = require('../models/Programme');

const DEFAULT_PHASES = [
  {
    name: 'Mobilisation', color: '#6366f1',
    activities: [
      { name: 'Site hoarding & security',  startWeek: 0, durationWeeks: 1 },
      { name: 'Site setup & welfare',      startWeek: 0, durationWeeks: 2 },
      { name: 'Setting out',               startWeek: 1, durationWeeks: 1 },
    ],
  },
  {
    name: 'Substructure', color: '#f59e0b',
    activities: [
      { name: 'Excavation',                startWeek: 2,  durationWeeks: 2 },
      { name: 'Blinding & DPC',            startWeek: 4,  durationWeeks: 1 },
      { name: 'Foundations',               startWeek: 4,  durationWeeks: 3 },
      { name: 'Ground beams & tie beams',  startWeek: 7,  durationWeeks: 2 },
      { name: 'Ground floor slab',         startWeek: 9,  durationWeeks: 2 },
    ],
  },
  {
    name: 'Superstructure', color: '#10b981',
    activities: [
      { name: 'Columns & beams (1st floor)',  startWeek: 11, durationWeeks: 3 },
      { name: 'Suspended floor slab',         startWeek: 14, durationWeeks: 2 },
      { name: 'Staircase',                    startWeek: 14, durationWeeks: 3 },
      { name: 'Columns & beams (2nd floor)',  startWeek: 16, durationWeeks: 3 },
      { name: 'Roof slab / ring beam',        startWeek: 19, durationWeeks: 2 },
    ],
  },
  {
    name: 'Roofing', color: '#ef4444',
    activities: [
      { name: 'Roof structure (trusses)',     startWeek: 21, durationWeeks: 2 },
      { name: 'Roof covering',                startWeek: 23, durationWeeks: 2 },
      { name: 'Fascia, soffit & gutters',     startWeek: 25, durationWeeks: 1 },
    ],
  },
  {
    name: 'External Envelope', color: '#8b5cf6',
    activities: [
      { name: 'External blockwork',           startWeek: 11, durationWeeks: 8 },
      { name: 'External render / cladding',   startWeek: 22, durationWeeks: 4 },
      { name: 'Windows & external doors',     startWeek: 24, durationWeeks: 3 },
    ],
  },
  {
    name: 'Internal Works', color: '#06b6d4',
    activities: [
      { name: 'Internal block partitions',    startWeek: 20, durationWeeks: 4 },
      { name: 'Internal plastering',          startWeek: 24, durationWeeks: 4 },
      { name: 'Floor screed',                 startWeek: 26, durationWeeks: 2 },
      { name: 'Ceiling (POP / drywall)',      startWeek: 28, durationWeeks: 3 },
    ],
  },
  {
    name: 'MEP', color: '#f97316',
    activities: [
      { name: 'First fix electrical',         startWeek: 20, durationWeeks: 3 },
      { name: 'First fix plumbing',           startWeek: 20, durationWeeks: 3 },
      { name: 'Second fix electrical',        startWeek: 28, durationWeeks: 3 },
      { name: 'Second fix plumbing',          startWeek: 28, durationWeeks: 2 },
      { name: 'Testing & commissioning',      startWeek: 32, durationWeeks: 2 },
    ],
  },
  {
    name: 'Finishes & Handover', color: '#84cc16',
    activities: [
      { name: 'Floor tiles & finishes',          startWeek: 30, durationWeeks: 3 },
      { name: 'Internal doors & ironmongery',    startWeek: 31, durationWeeks: 2 },
      { name: 'Painting & decorating',           startWeek: 31, durationWeeks: 4 },
      { name: 'External works & landscaping',    startWeek: 26, durationWeeks: 4 },
      { name: 'Snagging & handover',             startWeek: 34, durationWeeks: 2 },
    ],
  },
];

exports.list = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  const programmes = await Programme.find(filter)
    .populate('projectId', 'name')
    .select('-phases.activities -weeklyReports')
    .sort({ updatedAt: -1 });
  res.json({ programmes });
};

exports.get = async (req, res) => {
  const prog = await Programme.findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('projectId', 'name');
  if (!prog) return res.status(404).json({ message: 'Programme not found' });
  res.json({ programme: prog });
};

exports.create = async (req, res) => {
  const { projectId, name, startDate } = req.body;
  if (!startDate) return res.status(400).json({ message: 'startDate is required' });
  const prog = await Programme.create({
    companyId: req.user.companyId,
    projectId: projectId || null,
    name: name || 'Construction Programme',
    startDate,
    phases: DEFAULT_PHASES,
    createdBy: req.user._id,
  });
  res.status(201).json({ programme: prog });
};

exports.update = async (req, res) => {
  const prog = await Programme.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: req.body },
    { new: true }
  );
  if (!prog) return res.status(404).json({ message: 'Programme not found' });
  res.json({ programme: prog });
};

exports.remove = async (req, res) => {
  await Programme.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  res.json({ message: 'Deleted' });
};

exports.addWeeklyReport = async (req, res) => {
  const prog = await Programme.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!prog) return res.status(404).json({ message: 'Programme not found' });
  const { weekNumber, weekEnding, overallPlanned, overallActual, phaseProgress, lookAhead, issues, signedOffBy } = req.body;
  const existing = prog.weeklyReports.findIndex((r) => r.weekNumber === weekNumber);
  const report = { weekNumber, weekEnding, overallPlanned, overallActual, phaseProgress, lookAhead, issues, signedOffBy, signedOffAt: signedOffBy ? new Date() : null };
  if (existing >= 0) {
    prog.weeklyReports[existing] = { ...prog.weeklyReports[existing].toObject(), ...report };
  } else {
    prog.weeklyReports.push(report);
  }
  await prog.save();
  res.json({ programme: prog });
};
