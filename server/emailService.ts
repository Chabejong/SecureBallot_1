// EmailService using SendGrid integration for password reset emails
import { MailService } from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_VERIFIED_SENDER;

if (!SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

if (!SENDGRID_FROM_EMAIL) {
  console.warn("SENDGRID_FROM_EMAIL not set. You need to set this to a verified sender email in your SendGrid account.");
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

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    console.log(`Email sent successfully to ${params.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    
    let errorMessage = 'Failed to send email';
    if (error.code === 401) {
      errorMessage = 'SendGrid authentication failed. Please check your API key and sender email verification.';
    } else if (error.code === 403) {
      errorMessage = 'SendGrid permission denied. Please verify your sender email address in SendGrid.';
    } else if (error.response?.body?.errors) {
      errorMessage = error.response.body.errors.map((e: any) => e.message).join(', ');
    }
    
    return { success: false, error: errorMessage };
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

  const fromEmail = SENDGRID_FROM_EMAIL || 'noreply@example.com';
  
  if (!SENDGRID_FROM_EMAIL) {
    console.error('SENDGRID_FROM_EMAIL not configured. Password reset email may fail.');
  }

  const result = await sendEmail({
    to: email,
    from: fromEmail,
    subject,
    text,
    html,
  });
  
  if (!result.success) {
    console.error(`Failed to send password reset email to: ${email} - ${result.error}`);
  }
  
  return result.success;
}