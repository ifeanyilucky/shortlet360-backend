const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const User = require("../models/user");
const { sendEmail } = require("../utils/sendEmails");
const ejs = require("ejs");
const path = require("path");

// Send referral invitation email
const sendReferralInvitation = async (req, res) => {
  try {
    const { email } = req.body;
    const referrer = req.user;

    // Validate required fields
    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Email address is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Check if the email is the same as the referrer's email
    if (email.toLowerCase() === referrer.email.toLowerCase()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "You cannot refer yourself",
      });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "This email is already registered on Aplet360",
      });
    }

    // Generate referral code and link
    const currentYear = new Date().getFullYear();
    const referralCode = `APLET-${referrer.short_id}-${currentYear}`;
    const referralLink = `${process.env.FRONTEND_URL}/register?ref=${referralCode}`;

    // Render email template
    const emailHtml = await new Promise((resolve, reject) => {
      ejs.renderFile(
        path.join(__dirname, "../views/emails/referralInvitation.ejs"),
        {
          referrerName: `${referrer.first_name} ${referrer.last_name}`,
          referrerEmail: referrer.email,
          referralLink,
          referralCode,
          recipientEmail: email,
          date: new Date().toLocaleDateString(),
        },
        (err, result) => {
          if (err) {
            console.error("Error rendering email template:", err);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    // Send referral invitation email
    await sendEmail({
      to: email,
      subject: `${referrer.first_name} invited you to join Aplet360 - Get FREE Home Fix Services!`,
      text: `${referrer.first_name} ${referrer.last_name} has invited you to join Aplet360, Africa's premier apartment rental platform. Sign up using their referral link: ${referralLink} and both of you will earn FREE Home Fix services!`,
      html: emailHtml,
    });

    // Log the referral invitation (you might want to store this in a database)
    console.log(`Referral invitation sent from ${referrer.email} to ${email}`);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Referral invitation sent successfully",
      data: {
        referralCode,
        invitedEmail: email,
      },
    });
  } catch (error) {
    console.error("Error sending referral invitation:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to send referral invitation",
      error: error.message,
    });
  }
};

// Get user's referral statistics
const getReferralStats = async (req, res) => {
  try {
    const user = req.user;
    const Referral = require("../models/referral");

    const currentYear = new Date().getFullYear();
    const referralCode =
      user.referral?.referral_code || `APLET-${user.short_id}-${currentYear}`;

    // Get detailed referral statistics
    const totalReferrals = await Referral.countDocuments({
      referrer: user._id,
    });
    const verifiedReferrals = await Referral.countDocuments({
      referrer: user._id,
      status: "verified",
    });
    const pendingReferrals = await Referral.countDocuments({
      referrer: user._id,
      status: "pending",
    });

    // Calculate rewards
    const rewardCalculation = await Referral.calculateRewards(user._id);

    // Get recent referrals
    const recentReferrals = await Referral.find({ referrer: user._id })
      .populate("referred_user", "first_name last_name email role createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = {
      referralCode,
      totalReferrals,
      verifiedReferrals,
      pendingReferrals,
      earnedRewards: rewardCalculation.totalRewards,
      availableRewards: rewardCalculation.totalRewards,
      rewardBreakdown: {
        ownerReferrals: rewardCalculation.ownerReferrals,
        userReferrals: rewardCalculation.userReferrals,
        ownerRewards: rewardCalculation.ownerRewards,
        userRewards: rewardCalculation.userRewards,
      },
      recentReferrals: recentReferrals.map((ref) => ({
        id: ref._id,
        referredUser: ref.referred_user,
        status: ref.status,
        role: ref.referred_user_role,
        createdAt: ref.createdAt,
        verifiedAt: ref.verification_completed_at,
      })),
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch referral statistics",
      error: error.message,
    });
  }
};

// Get all referrals (Admin only)
const getAllReferrals = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, role, search } = req.query;
    const Referral = require("../models/referral");

    const query = {};

    if (status) {
      query.status = status;
    }

    if (role) {
      query.referred_user_role = role;
    }

    const skip = (page - 1) * limit;

    let referrals = await Referral.find(query)
      .populate("referrer", "first_name last_name email short_id")
      .populate("referred_user", "first_name last_name email short_id role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Apply search filter if provided
    if (search) {
      referrals = referrals.filter(
        (ref) =>
          ref.referrer?.first_name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          ref.referrer?.last_name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          ref.referrer?.email?.toLowerCase().includes(search.toLowerCase()) ||
          ref.referred_user?.first_name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          ref.referred_user?.last_name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          ref.referred_user?.email
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          ref.referral_code?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const totalReferrals = await Referral.countDocuments(query);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        referrals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReferrals / limit),
          totalReferrals,
          hasNext: page * limit < totalReferrals,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all referrals:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch referrals",
      error: error.message,
    });
  }
};

// Get referral analytics (Admin only)
const getReferralAnalytics = async (req, res) => {
  try {
    const Referral = require("../models/referral");

    // Overall statistics
    const totalReferrals = await Referral.countDocuments();
    const verifiedReferrals = await Referral.countDocuments({
      status: "verified",
    });
    const pendingReferrals = await Referral.countDocuments({
      status: "pending",
    });

    // Role-based statistics
    const ownerReferrals = await Referral.countDocuments({
      referred_user_role: "owner",
    });
    const userReferrals = await Referral.countDocuments({
      referred_user_role: "user",
    });

    // Top referrers
    const topReferrers = await Referral.aggregate([
      {
        $group: {
          _id: "$referrer",
          totalReferrals: { $sum: 1 },
          verifiedReferrals: {
            $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] },
          },
        },
      },
      { $sort: { totalReferrals: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalReferrals: 1,
          verifiedReferrals: 1,
          user: {
            first_name: 1,
            last_name: 1,
            email: 1,
            short_id: 1,
          },
        },
      },
    ]);

    // Monthly referral trends (last 12 months)
    const monthlyTrends = await Referral.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        overview: {
          totalReferrals,
          verifiedReferrals,
          pendingReferrals,
          conversionRate:
            totalReferrals > 0
              ? ((verifiedReferrals / totalReferrals) * 100).toFixed(2)
              : 0,
        },
        roleBreakdown: {
          ownerReferrals,
          userReferrals,
        },
        topReferrers,
        monthlyTrends,
      },
    });
  } catch (error) {
    console.error("Error fetching referral analytics:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch referral analytics",
      error: error.message,
    });
  }
};

// Validate referral code (utility endpoint for testing)
const validateReferralCode = async (req, res) => {
  try {
    const { referral_code } = req.query;

    if (!referral_code) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Referral code is required",
      });
    }

    const User = require("../models/user");
    let referrerUser = null;
    let method = null;

    // Method 1: Try to extract short_id from referral code format: APLET-{short_id}-{year}
    const referralCodeMatch = referral_code.match(/^APLET-(.+)-(\d{4})$/);
    if (referralCodeMatch) {
      const referrerShortId = referralCodeMatch[1];
      referrerUser = await User.findOne({ short_id: referrerShortId });
      if (referrerUser) method = "short_id_extraction";
    }

    // Method 2: Find by exact referral code
    if (!referrerUser) {
      referrerUser = await User.findOne({
        "referral.referral_code": referral_code,
      });
      if (referrerUser) method = "exact_referral_code";
    }

    // Method 3: Alternative format matching
    if (!referrerUser && referral_code.startsWith("APLET-")) {
      const altMatch = referral_code.match(/^APLET-([A-Za-z0-9]+)/);
      if (altMatch) {
        const possibleShortId = altMatch[1];
        referrerUser = await User.findOne({ short_id: possibleShortId });
        if (referrerUser) method = "alternative_format";
      }
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        referral_code,
        valid: !!referrerUser,
        method,
        referrer: referrerUser
          ? {
              id: referrerUser._id,
              name: `${referrerUser.first_name} ${referrerUser.last_name}`,
              email: referrerUser.email,
              short_id: referrerUser.short_id,
              referral_code: referrerUser.referral?.referral_code,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error validating referral code:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to validate referral code",
      error: error.message,
    });
  }
};

module.exports = {
  sendReferralInvitation,
  getReferralStats,
  getAllReferrals,
  getReferralAnalytics,
  validateReferralCode,
};
