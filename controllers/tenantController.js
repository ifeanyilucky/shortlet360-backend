const Tenant = require("../models/tenant");
const Property = require("../models/property");
const User = require("../models/user");
const { BadRequestError, NotFoundError } = require("../errors");
const { sendEmail } = require("../utils/sendEmails");
const generatePDF = require("../utils/pdfGenerator");

const tenantController = {
  // Get tenant by id
  getTenant: async (req, res) => {
    const { id } = req.params;
    const tenant = await Tenant.findById(id)
      .populate("property_id")
      .populate("tenant", "first_name last_name email phone");

    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }
    res.status(200).json({ success: true, data: tenant });
  },

  // Check if user has already paid for a property
  checkUserPaymentStatus: async (req, res) => {
    const { property_id } = req.params;
    const userId = req.user._id;

    try {
      // Check if user has an active or pending tenant record for this property
      const existingTenant = await Tenant.findOne({
        property_id,
        tenant: userId,
        lease_status: { $in: ["active", "pending"] },
        payment_status: "paid",
      });

      if (existingTenant) {
        return res.status(200).json({
          success: true,
          hasPaid: true,
          tenant: existingTenant,
        });
      }

      res.status(200).json({
        success: true,
        hasPaid: false,
      });
    } catch (error) {
      console.error("Error checking payment status:", error);
      throw error;
    }
  },

  // Get all tenants with filtering and pagination
  getAllTenants: async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search,
      property_id,
      tenant_name,
      lease_status,
      payment_status,
      owner_id,
    } = req.query;

    const query = {};

    // Filter by property owner
    if (owner_id) {
      const properties = await Property.find({ owner: owner_id }).select("_id");
      const propertyIds = properties.map((prop) => prop._id);
      query.property_id = { $in: propertyIds };
    }

    // Filter by specific property
    if (property_id) {
      query.property_id = property_id;
    }

    // Filter by lease status
    if (lease_status) {
      query.lease_status = lease_status;
    }

    // Filter by payment status
    if (payment_status) {
      query.payment_status = payment_status;
    }

    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { "tenant.first_name": searchRegex },
        { "tenant.last_name": searchRegex },
        { "tenant.email": searchRegex },
        { "property_id.property_name": searchRegex },
      ];
    }

    // Filter by tenant name
    if (tenant_name) {
      const nameRegex = new RegExp(tenant_name, "i");
      query.$or = [
        { "tenant.first_name": nameRegex },
        { "tenant.last_name": nameRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const tenants = await Tenant.find(query)
      .populate("property_id", "property_name location")
      .populate("tenant", "first_name last_name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Tenant.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: tenants,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: total,
        items_per_page: limitNum,
      },
    });
  },

  // Create a new tenant (when payment is successful)
  createTenant: async (req, res) => {
    try {
      console.log("Received tenant creation request:", req.body); // Debug log

      const {
        property_id,
        lease_start_date,
        lease_end_date,
        tenant_count,
        payment,
        payment_method = "paystack",
        payment_reference,
        // Enhanced tenant information
        tenant_phone,
        tenant_relationship,
        next_of_kin,
        employment_info,
        emergency_contact,
        special_requests,
        documents,
      } = req.body;

      // Log each field for debugging
      console.log("Validation check:", {
        property_id: !!property_id,
        lease_start_date: !!lease_start_date,
        lease_end_date: !!lease_end_date,
        tenant_count: !!tenant_count,
        payment: !!payment,
        tenant_phone: !!tenant_phone,
        tenant_relationship: !!tenant_relationship,
        next_of_kin: !!next_of_kin,
        employment_info: !!employment_info,
      });

      if (
        !property_id ||
        !lease_start_date ||
        !lease_end_date ||
        !tenant_count ||
        !payment ||
        !tenant_phone ||
        !tenant_relationship ||
        !next_of_kin ||
        !employment_info
      ) {
        console.log("Missing required fields:", {
          property_id: !property_id,
          lease_start_date: !lease_start_date,
          lease_end_date: !lease_end_date,
          tenant_count: !tenant_count,
          payment: !payment,
          tenant_phone: !tenant_phone,
          tenant_relationship: !tenant_relationship,
          next_of_kin: !next_of_kin,
          employment_info: !employment_info,
        });
        throw new BadRequestError("Please provide all required tenant details");
      }

      // Validate next_of_kin fields
      if (
        !next_of_kin.name ||
        !next_of_kin.phone ||
        !next_of_kin.relationship ||
        !next_of_kin.address
      ) {
        throw new BadRequestError(
          "Please provide complete next of kin information"
        );
      }

      // Validate employment_info fields
      if (
        !employment_info.employer_name ||
        !employment_info.job_title ||
        !employment_info.monthly_income ||
        !employment_info.employment_type
      ) {
        throw new BadRequestError(
          "Please provide complete employment information"
        );
      }

      // Validate that dates are valid
      const startDate = new Date(lease_start_date);
      const endDate = new Date(lease_end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestError("Invalid lease dates provided");
      }

      if (startDate >= endDate) {
        throw new BadRequestError(
          "Lease start date must be before lease end date"
        );
      }

      // Validate tenant_count
      if (typeof tenant_count !== "number" || tenant_count < 1) {
        throw new BadRequestError("Tenant count must be a positive number");
      }

      // Validate payment object
      if (!payment || typeof payment !== "object") {
        throw new BadRequestError("Invalid payment information provided");
      }

      // Check if property exists and is available for rent
      const property = await Property.findById(property_id);
      if (!property) {
        throw new NotFoundError("Property not found");
      }

      if (property.property_category !== "rent") {
        throw new BadRequestError("This property is not available for rent");
      }

      if (!property.is_active || property.publication_status !== "published") {
        throw new BadRequestError("This property is not available for rent");
      }

      // Check if property is already rented for the specified period
      const existingTenant = await Tenant.findOne({
        property_id,
        lease_status: { $in: ["active", "pending"] },
        $or: [
          {
            lease_start_date: { $lte: new Date(lease_end_date) },
            lease_end_date: { $gte: new Date(lease_start_date) },
          },
        ],
      });

      if (existingTenant) {
        throw new BadRequestError(
          "This property is already rented for the specified period"
        );
      }

      // Calculate rent amounts
      const annualRent = property.pricing.rent_per_year.annual_rent;
      const monthlyRent = annualRent / 12;
      const securityDeposit = property.pricing.rent_per_year.caution_fee || 0;
      const agencyFee = property.pricing.rent_per_year.is_agency_fee_active
        ? property.pricing.rent_per_year.agency_fee
        : 0;
      const commissionFee = property.pricing.rent_per_year
        .is_commission_fee_active
        ? property.pricing.rent_per_year.commission_fee
        : 0;
      const legalFee = property.pricing.rent_per_year.is_legal_fee_active
        ? property.pricing.rent_per_year.legal_fee
        : 0;

      const totalInitialPayment =
        annualRent + securityDeposit + agencyFee + commissionFee + legalFee;

      // Create tenant record
      const tenantData = {
        property_id,
        tenant: req.user._id,
        lease_start_date: new Date(lease_start_date),
        lease_end_date: new Date(lease_end_date),
        monthly_rent: monthlyRent,
        annual_rent: annualRent,
        security_deposit: securityDeposit,
        agency_fee: agencyFee,
        commission_fee: commissionFee,
        legal_fee: legalFee,
        total_initial_payment: totalInitialPayment,
        payment_status: "paid",
        lease_status: "pending",
        payment,
        payment_method,
        payment_reference,
        tenant_count,
        // Enhanced tenant information
        tenant_phone,
        tenant_relationship,
        next_of_kin,
        employment_info,
        emergency_contact,
        special_requests,
        documents,
      };

      const tenant = await Tenant.create(tenantData);

      // Populate the tenant data for response
      const populatedTenant = await Tenant.findById(tenant._id)
        .populate("property_id")
        .populate("tenant", "first_name last_name email phone");

      // Send confirmation email to tenant
      try {
        await sendEmail({
          to: req.user.email,
          subject: "Rental Confirmation - Aplet360",
          template: "rental-confirmation",
          context: {
            tenantName: `${req.user.first_name} ${req.user.last_name}`,
            propertyName: property.property_name,
            propertyAddress: `${property.location.street_address}, ${property.location.city}, ${property.location.state}`,
            leaseStartDate: new Date(lease_start_date).toLocaleDateString(),
            leaseEndDate: new Date(lease_end_date).toLocaleDateString(),
            monthlyRent: monthlyRent.toLocaleString(),
            annualRent: annualRent.toLocaleString(),
            securityDeposit: securityDeposit.toLocaleString(),
            totalPayment: totalInitialPayment.toLocaleString(),
          },
        });
      } catch (emailError) {
        console.error("Error sending rental confirmation email:", emailError);
      }

      // Send notification email to property owner
      try {
        const owner = await User.findById(property.owner);
        if (owner) {
          await sendEmail({
            to: owner.email,
            subject: "New Tenant - Aplet360",
            template: "new-tenant-notification",
            context: {
              ownerName: `${owner.first_name} ${owner.last_name}`,
              tenantName: `${req.user.first_name} ${req.user.last_name}`,
              propertyName: property.property_name,
              propertyAddress: `${property.location.street_address}, ${property.location.city}, ${property.location.state}`,
              leaseStartDate: new Date(lease_start_date).toLocaleDateString(),
              leaseEndDate: new Date(lease_end_date).toLocaleDateString(),
              monthlyRent: monthlyRent.toLocaleString(),
              annualRent: annualRent.toLocaleString(),
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending owner notification email:", emailError);
      }

      res.status(201).json({
        success: true,
        message: "Tenant created successfully",
        data: populatedTenant,
      });
    } catch (error) {
      console.error("Error creating tenant:", error);
      throw error;
    }
  },

  // Update tenant status
  updateTenantStatus: async (req, res) => {
    const { id } = req.params;
    const { lease_status, payment_status, notes } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    // Check if user is the property owner
    const property = await Property.findById(tenant.property_id);
    if (property.owner.toString() !== req.user._id.toString()) {
      throw new BadRequestError(
        "You can only update tenants for your properties"
      );
    }

    const updateData = {};
    if (lease_status) updateData.lease_status = lease_status;
    if (payment_status) updateData.payment_status = payment_status;
    if (notes !== undefined) updateData.notes = notes;

    const updatedTenant = await Tenant.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("property_id")
      .populate("tenant", "first_name last_name email phone");

    res.status(200).json({
      success: true,
      message: "Tenant status updated successfully",
      data: updatedTenant,
    });
  },

  // Add rent payment
  addRentPayment: async (req, res) => {
    const { id } = req.params;
    const { month, amount, payment_reference } = req.body;

    if (!month || !amount || !payment_reference) {
      throw new BadRequestError(
        "Month, amount, and payment reference are required"
      );
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    // Check if rent is already paid for this month
    if (tenant.isRentPaidForMonth(month)) {
      throw new BadRequestError("Rent is already paid for this month");
    }

    await tenant.addRentPayment(month, amount, payment_reference);

    const updatedTenant = await Tenant.findById(id)
      .populate("property_id")
      .populate("tenant", "first_name last_name email phone");

    res.status(200).json({
      success: true,
      message: "Rent payment added successfully",
      data: updatedTenant,
    });
  },

  // Get tenant statistics for property owner
  getTenantStatistics: async (req, res) => {
    const { timeframe = "all" } = req.query;

    // Get all properties owned by the user
    const properties = await Property.find({ owner: req.user._id }).select(
      "_id"
    );
    const propertyIds = properties.map((prop) => prop._id);

    const query = { property_id: { $in: propertyIds } };

    // Add timeframe filter
    if (timeframe !== "all") {
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      query.createdAt = { $gte: startDate };
    }

    const tenants = await Tenant.find(query);
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(
      (t) => t.lease_status === "active"
    ).length;
    const pendingTenants = tenants.filter(
      (t) => t.lease_status === "pending"
    ).length;
    const expiredTenants = tenants.filter(
      (t) => t.lease_status === "expired"
    ).length;

    const totalRentCollected = tenants.reduce((sum, tenant) => {
      return (
        sum +
        tenant.rent_payment_history
          .filter((payment) => payment.status === "paid")
          .reduce((paymentSum, payment) => paymentSum + payment.amount, 0)
      );
    }, 0);

    const totalInitialPayments = tenants.reduce((sum, tenant) => {
      return (
        sum +
        (tenant.payment_status === "paid" ? tenant.total_initial_payment : 0)
      );
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        pending_tenants: pendingTenants,
        expired_tenants: expiredTenants,
        total_rent_collected: totalRentCollected,
        total_initial_payments: totalInitialPayments,
        average_monthly_rent:
          totalTenants > 0
            ? tenants.reduce((sum, t) => sum + t.monthly_rent, 0) / totalTenants
            : 0,
      },
    });
  },

  // Get user's tenant history
  getUserTenants: async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const tenants = await Tenant.find({ tenant: req.user._id })
      .populate("property_id", "property_name location property_images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Tenant.countDocuments({ tenant: req.user._id });
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: tenants,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: total,
        items_per_page: limitNum,
      },
    });
  },

  // Add maintenance request
  addMaintenanceRequest: async (req, res) => {
    const { id } = req.params;
    const { title, description, priority = "medium" } = req.body;

    if (!title || !description) {
      throw new BadRequestError("Title and description are required");
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    tenant.maintenance_requests.push({
      title,
      description,
      priority,
      status: "pending",
    });

    await tenant.save();

    const updatedTenant = await Tenant.findById(id)
      .populate("property_id")
      .populate("tenant", "first_name last_name email phone");

    res.status(200).json({
      success: true,
      message: "Maintenance request added successfully",
      data: updatedTenant,
    });
  },

  // Update maintenance request status (property owner only)
  updateMaintenanceRequest: async (req, res) => {
    const { id, requestId } = req.params;
    const { status } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    // Check if user is the property owner
    const property = await Property.findById(tenant.property_id);
    if (property.owner.toString() !== req.user._id.toString()) {
      throw new BadRequestError(
        "You can only update maintenance requests for your properties"
      );
    }

    const maintenanceRequest = tenant.maintenance_requests.id(requestId);
    if (!maintenanceRequest) {
      throw new NotFoundError("Maintenance request not found");
    }

    maintenanceRequest.status = status;
    if (status === "completed") {
      maintenanceRequest.completed_at = new Date();
    }

    await tenant.save();

    const updatedTenant = await Tenant.findById(id)
      .populate("property_id")
      .populate("tenant", "first_name last_name email phone");

    res.status(200).json({
      success: true,
      message: "Maintenance request updated successfully",
      data: updatedTenant,
    });
  },
};

module.exports = tenantController;
