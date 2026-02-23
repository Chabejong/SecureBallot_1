// SMS Service using Twilio connector integration
import twilio from 'twilio';

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, { accountSid });
}

async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

export async function isSmsConfigured(): Promise<boolean> {
  try {
    const creds = await getCredentials();
    return !!(creds.accountSid && creds.apiKey && creds.apiKeySecret && creds.phoneNumber);
  } catch {
    return false;
  }
}

export async function sendSms(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const configured = await isSmsConfigured();
    if (!configured) {
      return { success: false, error: 'SMS service not configured' };
    }

    const twilioClient = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
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
