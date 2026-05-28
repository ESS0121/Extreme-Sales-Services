// services/emailService.js
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailService = {
  // Send booking confirmation email
  async sendBookingEmail(customerEmail, customerName, requestId, serviceType, phone) {
    try {
      const msg = {
        to: customerEmail,
        from: process.env.BUSINESS_EMAIL,
        subject: `✅ Service Request Confirmed - ${requestId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">Service Request Confirmed! ✅</h2>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="margin: 10px 0; font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
              
              <p style="margin: 20px 0; color: #555;">Your AC service request has been successfully received and confirmed. A technician will contact you shortly to schedule the service.</p>
              
              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 5px 0;"><strong>Request Details:</strong></p>
                <p style="margin: 5px 0;"><strong>Request ID:</strong> <span style="font-size: 18px; color: #2563eb; font-weight: bold;">${requestId}</span></p>
                <p style="margin: 5px 0;"><strong>Service Type:</strong> ${serviceType}</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>
              </div>

              <p style="margin: 20px 0; color: #555;"><strong>Next Steps:</strong></p>
              <ul style="margin: 10px 0; color: #555;">
                <li>A technician will call you within 2-4 hours</li>
                <li>You can track your request here: <a href="https://extremeac.com/status.html" style="color: #2563eb; text-decoration: none;"><strong>Track Status</strong></a></li>
                <li>Please keep your Request ID handy</li>
              </ul>

              <p style="margin: 20px 0; color: #555;">Questions? Reply to this email or call our support team.</p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
              
              <p style="margin: 10px 0; font-size: 12px; color: #999;">
                <strong>${process.env.BUSINESS_NAME}</strong><br>
                Support: ${process.env.BUSINESS_EMAIL}
              </p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`✅ Booking email sent to ${customerEmail}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error(`❌ Email error for ${customerEmail}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send status update email
  async sendStatusUpdateEmail(customerEmail, customerName, requestId, newStatus, serviceType) {
    try {
      const statusColors = {
        'Pending': '#f59e0b',
        'Assigned': '#3b82f6',
        'In Progress': '#8b5cf6',
        'Completed': '#10b981',
        'Cancelled': '#ef4444'
      };

      const statusEmojis = {
        'Pending': '⏳',
        'Assigned': '👨‍🔧',
        'In Progress': '🔧',
        'Completed': '✅',
        'Cancelled': '❌'
      };

      const statusColor = statusColors[newStatus] || '#6b7280';
      const statusEmoji = statusEmojis[newStatus] || '📋';

      const msg = {
        to: customerEmail,
        from: process.env.BUSINESS_EMAIL,
        subject: `${statusEmoji} Service Update - ${requestId} is now ${newStatus}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">${statusEmoji} Service Status Update</h2>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="margin: 10px 0; font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
              
              <p style="margin: 20px 0; color: #555;">Your service request has been updated:</p>
              
              <div style="background: ${statusColor}20; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 5px 0;"><strong>Request ID:</strong> ${requestId}</p>
                <p style="margin: 5px 0;"><strong>Service Type:</strong> ${serviceType}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="font-size: 18px; font-weight: bold; color: ${statusColor};">${statusEmoji} ${newStatus}</span></p>
              </div>

              <p style="margin: 20px 0; color: #555;">
                <a href="https://extremeac.com/status.html" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Track Your Service →
                </a>
              </p>

              <p style="margin: 20px 0; font-size: 12px; color: #999;">
                <strong>${process.env.BUSINESS_NAME}</strong><br>
                Support: ${process.env.BUSINESS_EMAIL}
              </p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`✅ Status update email sent to ${customerEmail}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error(`❌ Email error for ${customerEmail}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send AMC subscription confirmation
  async sendAMCConfirmationEmail(customerEmail, customerName, planName, phone) {
    try {
      const msg = {
        to: customerEmail,
        from: process.env.BUSINESS_EMAIL,
        subject: `🛡️ AMC Subscription Request Received - ${planName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">🛡️ AMC Plan Activated!</h2>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="margin: 10px 0; font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
              
              <p style="margin: 20px 0; color: #555;">Thank you for subscribing to our Annual Maintenance Contract!</p>
              
              <div style="background: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #8b5cf6; font-weight: bold;">Pending Activation</span></p>
              </div>

              <p style="margin: 20px 0; color: #555;"><strong>Benefits:</strong></p>
              <ul style="margin: 10px 0; color: #555;">
                <li>✅ Priority service scheduling</li>
                <li>✅ Free maintenance visits included</li>
                <li>✅ 24/7 emergency support</li>
              </ul>

              <p style="margin: 20px 0; color: #555;">Our team will contact you shortly to confirm your subscription and collection of payment.</p>

              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
              
              <p style="margin: 10px 0; font-size: 12px; color: #999;">
                <strong>${process.env.BUSINESS_NAME}</strong><br>
                Support: ${process.env.BUSINESS_EMAIL}
              </p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`✅ AMC confirmation email sent to ${customerEmail}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error(`❌ Email error for ${customerEmail}:`, error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = emailService;
