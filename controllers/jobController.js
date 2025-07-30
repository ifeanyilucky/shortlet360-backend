const Job = require("../models/job");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

// Create a new job
const createJob = async (req, res) => {
  const {
    title,
    department,
    location,
    jobType,
    experienceLevel,
    salary,
    description,
    responsibilities,
    requirements,
    niceToHave,
    benefits,
    skills,
    applicationDeadline,
    isRemote,
    isUrgent,
    tags,
  } = req.body;

  // Validate salary range
  if (salary.min >= salary.max) {
    throw new BadRequestError(
      "Minimum salary must be less than maximum salary"
    );
  }

  // Validate application deadline
  const deadline = new Date(applicationDeadline);
  if (deadline <= new Date()) {
    throw new BadRequestError("Application deadline must be in the future");
  }

  // Generate short_id
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const short_id = `JOB${timestamp}${random}`;

  const job = await Job.create({
    title,
    department,
    location,
    jobType,
    experienceLevel,
    salary,
    description,
    responsibilities,
    requirements,
    niceToHave,
    benefits,
    skills,
    applicationDeadline: deadline,
    isRemote,
    isUrgent,
    tags,
    createdBy: req.user._id,
    short_id,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Job created successfully",
    job,
  });
};

// Get all jobs (admin)
const getAllJobs = async (req, res) => {
  const {
    status,
    department,
    jobType,
    experienceLevel,
    search,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by department
  if (department) {
    query.department = department;
  }

  // Filter by job type
  if (jobType) {
    query.jobType = jobType;
  }

  // Filter by experience level
  if (experienceLevel) {
    query.experienceLevel = experienceLevel;
  }

  // Search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Sorting
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

  const jobs = await Job.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit))
    .populate("createdBy", "first_name last_name email");

  const totalJobs = await Job.countDocuments(query);
  const totalPages = Math.ceil(totalJobs / parseInt(limit));

  res.status(StatusCodes.OK).json({
    success: true,
    jobs,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalJobs,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
  });
};

// Get public jobs (for career page)
const getPublicJobs = async (req, res) => {
  const {
    department,
    jobType,
    experienceLevel,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const query = {
    status: "published",
    applicationDeadline: { $gt: new Date() },
  };

  // Filter by department
  if (department) {
    query.department = department;
  }

  // Filter by job type
  if (jobType) {
    query.jobType = jobType;
  }

  // Filter by experience level
  if (experienceLevel) {
    query.experienceLevel = experienceLevel;
  }

  // Search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const jobs = await Job.find(query)
    .sort({ isUrgent: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("-createdBy -__v");

  const totalJobs = await Job.countDocuments(query);
  const totalPages = Math.ceil(totalJobs / parseInt(limit));

  res.status(StatusCodes.OK).json({
    success: true,
    jobs,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalJobs,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
  });
};

// Get job by ID
const getJobById = async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id).populate(
    "createdBy",
    "first_name last_name email"
  );

  if (!job) {
    throw new NotFoundError("Job not found");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    job,
  });
};

// Update job
const updateJob = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Validate salary range if provided
  if (updateData.salary) {
    if (updateData.salary.min >= updateData.salary.max) {
      throw new BadRequestError(
        "Minimum salary must be less than maximum salary"
      );
    }
  }

  // Validate application deadline if provided
  if (updateData.applicationDeadline) {
    const deadline = new Date(updateData.applicationDeadline);
    if (deadline <= new Date()) {
      throw new BadRequestError("Application deadline must be in the future");
    }
    updateData.applicationDeadline = deadline;
  }

  const job = await Job.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate("createdBy", "first_name last_name email");

  if (!job) {
    throw new NotFoundError("Job not found");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Job updated successfully",
    job,
  });
};

// Delete job
const deleteJob = async (req, res) => {
  const { id } = req.params;

  const job = await Job.findByIdAndDelete(id);

  if (!job) {
    throw new NotFoundError("Job not found");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Job deleted successfully",
  });
};

// Update job status
const updateJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["draft", "published", "closed", "archived"];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError("Invalid status");
  }

  const job = await Job.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).populate("createdBy", "first_name last_name email");

  if (!job) {
    throw new NotFoundError("Job not found");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Job status updated successfully",
    job,
  });
};

// Get job statistics
const getJobStatistics = async (req, res) => {
  const totalJobs = await Job.countDocuments();
  const publishedJobs = await Job.countDocuments({ status: "published" });
  const draftJobs = await Job.countDocuments({ status: "draft" });
  const closedJobs = await Job.countDocuments({ status: "closed" });
  const archivedJobs = await Job.countDocuments({ status: "archived" });

  // Jobs by department
  const jobsByDepartment = await Job.aggregate([
    {
      $group: {
        _id: "$department",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Jobs by type
  const jobsByType = await Job.aggregate([
    {
      $group: {
        _id: "$jobType",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Recent jobs
  const recentJobs = await Job.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title department status createdAt short_id");

  // Urgent jobs
  const urgentJobs = await Job.countDocuments({ isUrgent: true });

  res.status(StatusCodes.OK).json({
    success: true,
    statistics: {
      totalJobs,
      publishedJobs,
      draftJobs,
      closedJobs,
      archivedJobs,
      urgentJobs,
      jobsByDepartment,
      jobsByType,
    },
    recentJobs,
  });
};

// Bulk update job status
const bulkUpdateJobStatus = async (req, res) => {
  const { jobIds, status } = req.body;

  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    throw new BadRequestError("Job IDs array is required");
  }

  const validStatuses = ["draft", "published", "closed", "archived"];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError("Invalid status");
  }

  const result = await Job.updateMany({ _id: { $in: jobIds } }, { status });

  res.status(StatusCodes.OK).json({
    success: true,
    message: `${result.modifiedCount} jobs updated successfully`,
    modifiedCount: result.modifiedCount,
  });
};

// Duplicate job
const duplicateJob = async (req, res) => {
  const { id } = req.params;

  const originalJob = await Job.findById(id);
  if (!originalJob) {
    throw new NotFoundError("Job not found");
  }

  // Create a copy with draft status
  // Generate short_id for duplicate
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const short_id = `JOB${timestamp}${random}`;

  const jobData = {
    title: `${originalJob.title} (Copy)`,
    department: originalJob.department,
    location: originalJob.location,
    jobType: originalJob.jobType,
    experienceLevel: originalJob.experienceLevel,
    salary: originalJob.salary,
    description: originalJob.description,
    responsibilities: originalJob.responsibilities,
    requirements: originalJob.requirements,
    niceToHave: originalJob.niceToHave,
    benefits: originalJob.benefits,
    skills: originalJob.skills,
    applicationDeadline: originalJob.applicationDeadline,
    isRemote: originalJob.isRemote,
    isUrgent: originalJob.isUrgent,
    tags: originalJob.tags,
    status: "draft",
    createdBy: req.user._id,
    short_id,
  };

  const newJob = await Job.create(jobData);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Job duplicated successfully",
    job: newJob,
  });
};

module.exports = {
  createJob,
  getAllJobs,
  getPublicJobs,
  getJobById,
  updateJob,
  deleteJob,
  updateJobStatus,
  getJobStatistics,
  bulkUpdateJobStatus,
  duplicateJob,
};
