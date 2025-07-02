// Newsletter template utilities

const createBlogPostNewsletter = (blogPost, blogUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Aplet360</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Property Insights & Updates</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 20px;">
        <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; line-height: 1.3;">
          ${blogPost.title}
        </h2>

        ${blogPost.featured_image ? `
          <img src="${blogPost.featured_image.url}" alt="${blogPost.title}" 
               style="width: 100%; max-width: 560px; height: auto; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ` : ''}

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
          ${blogPost.excerpt || 'Check out our latest insights on the property market and discover valuable tips for your property journey.'}
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${blogUrl}" 
             style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
            Read Full Article
          </a>
        </div>

        <!-- Additional Content -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">Why Choose Aplet360?</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Verified property listings</li>
            <li>Flexible payment options</li>
            <li>Professional property management</li>
            <li>24/7 customer support</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f3f4f6; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
          Visit <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}" style="color: #3b82f6; text-decoration: none;">Aplet360.com</a> for more property insights and listings.
        </p>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/blog" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Blog</a>
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/book-now" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Find Properties</a>
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/contact" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Contact</a>
        </div>
      </div>
    </div>
  `;
};

const createGeneralNewsletter = (subject, content) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Aplet360</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Property Insights & Updates</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 20px;">
        <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; line-height: 1.3;">
          ${subject}
        </h2>

        <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          ${content}
        </div>

        <!-- CTA Section -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
          <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">Explore Our Services</h3>
          <div style="margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/book-now" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 600;">
              Find Properties
            </a>
            <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/property-management-solutions" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 600;">
              Property Management
            </a>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f3f4f6; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
          Visit <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}" style="color: #3b82f6; text-decoration: none;">Aplet360.com</a> for more property insights and listings.
        </p>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/blog" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Blog</a>
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/book-now" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Find Properties</a>
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/contact" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Contact</a>
        </div>
      </div>
    </div>
  `;
};

const createPropertyAlertNewsletter = (properties) => {
  const propertyCards = properties.map(property => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0; overflow: hidden;">
      ${property.property_images?.[0]?.url ? `
        <img src="${property.property_images[0].url}" alt="${property.title}" 
             style="width: 100%; height: 200px; object-fit: cover;">
      ` : ''}
      <div style="padding: 20px;">
        <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 10px 0;">${property.title}</h3>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">${property.location}</p>
        <p style="color: #059669; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
          From ₦${property.pricing?.per_day?.base_price?.toLocaleString() || 'N/A'}/day
        </p>
        <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/property/${property._id}" 
           style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 14px;">
          View Details
        </a>
      </div>
    </div>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Aplet360</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">New Property Listings</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 20px;">
        <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; line-height: 1.3;">
          New Properties Just Listed!
        </h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
          Check out these amazing new properties that just became available on Aplet360.
        </p>

        ${propertyCards}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/book-now" 
             style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
            View All Properties
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f3f4f6; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
          Visit <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}" style="color: #3b82f6; text-decoration: none;">Aplet360.com</a> for more property insights and listings.
        </p>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/blog" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Blog</a>
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/book-now" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Find Properties</a>
          <a href="${process.env.FRONTEND_URL || 'https://aplet360.com'}/contact" style="color: #3b82f6; text-decoration: none; margin: 0 15px;">Contact</a>
        </div>
      </div>
    </div>
  `;
};

module.exports = {
  createBlogPostNewsletter,
  createGeneralNewsletter,
  createPropertyAlertNewsletter,
};
