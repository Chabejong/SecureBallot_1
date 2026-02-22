// SMS Service using Twilio for sending text messages
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  if (!client) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

export function isSmsConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}

export async function sendSms(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSmsConfigured()) {
      return { success: false, error: 'SMS service not configured' };
    }

    const twilioClient = getClient();
    const normalizedTo = to.startsWith('+') ? to : `+${to}`;

    await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: normalizedTo,
    });

    console.log(`SMS sent successfully to ${normalizedTo}`);
    return { success: true };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);

    let errorMessage = 'Failed to send SMS';
    if (error.code === 21211) {
      errorMessage = `Invalid phone number: ${to}`;
    } else if (error.code === 21608) {
      errorMessage = 'Twilio phone number not capable of sending SMS to this region';
    } else if (error.code === 20003) {
      errorMessage = 'Twilio authentication failed. Please check your credentials.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

export async function sendInvitationSms(
  phone: string,
  pollTitle: string,
  voteLink: string,
  endDate: Date
): Promise<{ success: boolean; error?: string }> {
  const body = `Ballot Box: You're invited to vote on "${pollTitle}". Cast your vote here: ${voteLink} (Voting ends: ${endDate.toLocaleDateString()})`;
  return sendSms(phone, body);
}
