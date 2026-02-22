// EmailService using AgentMail integration for sending emails
import { getUncachableAgentMailClient } from './agentMailClient';

let ballotBoxInboxId: string | null = null;

async function getOrCreateInbox(): Promise<string> {
  const client = await getUncachableAgentMailClient();

  if (ballotBoxInboxId) {
    try {
      await client.inboxes.get(ballotBoxInboxId);
      return ballotBoxInboxId;
    } catch {
      ballotBoxInboxId = null;
    }
  }

  const listResponse = await client.inboxes.list();
  const inboxes = (listResponse as any)?.inboxes || [];

  const ballotBoxInbox = inboxes.find((inbox: any) => inbox.displayName === 'Ballot Box');
  if (ballotBoxInbox) {
    ballotBoxInboxId = ballotBoxInbox.inboxId;
    console.log(`Found Ballot Box inbox: ${ballotBoxInboxId}`);
    return ballotBoxInboxId!;
  }

  try {
    const newInbox = await client.inboxes.create({
      displayName: 'Ballot Box',
    });
    const inboxData = newInbox as any;
    ballotBoxInboxId = inboxData.inboxId;
    console.log(`Created AgentMail inbox: ${ballotBoxInboxId}`);
    return ballotBoxInboxId!;
  } catch (createError: any) {
    if (createError.statusCode === 403 && createError.body?.name === 'LimitExceededError') {
      if (inboxes.length > 0) {
        ballotBoxInboxId = inboxes[0].inboxId;
        console.log(`Inbox limit reached. Using first available inbox: ${ballotBoxInboxId}`);
        return ballotBoxInboxId!;
      }
    }
    throw createError;
  }
}

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getUncachableAgentMailClient();
    const inboxId = await getOrCreateInbox();

    await client.inboxes.messages.send(inboxId, {
      to: [params.to],
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    console.log(`Email sent successfully to ${params.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('AgentMail email error:', error);

    let errorMessage = 'Failed to send email';
    if (error.statusCode === 401 || error.status === 401) {
      errorMessage = 'AgentMail authentication failed. Please check your API key.';
    } else if (error.statusCode === 403 || error.status === 403) {
      const bodyMessage = error.body?.message || '';
      if (bodyMessage.includes('bounced') || bodyMessage.includes('complained')) {
        errorMessage = `Email delivery failed: ${bodyMessage}`;
        console.warn(`Deliverability issue for ${params.to}: ${bodyMessage}`);
      } else if (bodyMessage.includes('LimitExceeded')) {
        errorMessage = 'AgentMail account limit exceeded.';
      } else {
        errorMessage = `AgentMail error: ${bodyMessage || 'Permission denied'}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
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

  const subject = 'Reset Your Password - Ballot Box';

  const text = `
Hello ${firstName || 'User'},

You recently requested to reset your password for Ballot Box. Click the link below to reset it:

${resetUrl}

This link will expire in 2 hours for security reasons.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
Ballot Box Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Ballot Box</h1>
        <p style="color: #6b7280; margin: 5px 0;">Secure Community Voting</p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #4b5563; line-height: 1.5;">
          Hello ${firstName || 'User'},
        </p>
        <p style="color: #4b5563; line-height: 1.5;">
          You recently requested to reset your password for Ballot Box. 
          Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    font-weight: bold;
                    display: inline-block;">
            Reset Password
          </a>
        </div>
        <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd;">
          <p style="margin: 0; color: #555; font-size: 14px; font-weight: bold;">If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="margin: 10px 0 0 0; word-break: break-all; color: #2563eb; font-size: 13px;">
            ${resetUrl}
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This link will expire in 2 hours for security reasons.
        </p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        <p style="margin-bottom: 0;">Best regards,<br>Ballot Box Team</p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
  
  if (!result.success) {
    console.error(`Failed to send password reset email to: ${email} - ${result.error}`);
  }
  
  return result.success;
}
