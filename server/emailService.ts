// EmailService using SendGrid integration for password reset emails
import { MailService } from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string,
  firstName?: string
): Promise<boolean> {
  const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https://' : 'http://';
  const resetUrl = `${protocol}${domain}/reset-password?token=${resetToken}`;
  
  const subject = 'Reset Your Password - The Ballot Box';
  
  const text = `
Hello ${firstName || 'User'},

You recently requested to reset your password for The Ballot Box. Click the link below to reset it:

${resetUrl}

This link will expire in 2 hours for security reasons.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
The Ballot Box Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">The Ballot Box</h1>
        <p style="color: #6b7280; margin: 5px 0;">Secure Community Voting</p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #4b5563; line-height: 1.5;">
          Hello ${firstName || 'User'},
        </p>
        <p style="color: #4b5563; line-height: 1.5;">
          You recently requested to reset your password for The Ballot Box. 
          Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(to right, #2563eb, #1d4ed8); 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: 500;
                    display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This link will expire in 2 hours for security reasons.
        </p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        <p style="margin-bottom: 0;">Best regards,<br>The Ballot Box Team</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    from: 'noreply@ballotbox.app', // Configure your verified sender domain in SendGrid
    subject,
    text,
    html,
  });
}