// SMS Service using Twilio - connector integration with env var fallback
import twilio from 'twilio';

interface TwilioCredentials {
  accountSid: string;
  authKey: string;
  authSecret: string;
  phoneNumber: string;
  source: 'connector' | 'env';
}

async function getConnectorCredentials(): Promise<TwilioCredentials | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    if (!hostname) return null;

    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

    if (!xReplitToken) return null;

    const connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings?.settings?.account_sid || !connectionSettings?.settings?.api_key || !connectionSettings?.settings?.api_key_secret) {
      return null;
    }

    return {
      accountSid: connectionSettings.settings.account_sid,
      authKey: connectionSettings.settings.api_key,
      authSecret: connectionSettings.settings.api_key_secret,
      phoneNumber: connectionSettings.settings.phone_number,
      source: 'connector'
    };
  } catch {
    return null;
  }
}

function getEnvCredentials(): TwilioCredentials | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) return null;

  return {
    accountSid,
    authKey: accountSid,
    authSecret: authToken,
    phoneNumber,
    source: 'env'
  };
}

async function getCredentials(): Promise<TwilioCredentials> {
  const connectorCreds = await getConnectorCredentials();
  if (connectorCreds) return connectorCreds;

  const envCreds = getEnvCredentials();
  if (envCreds) return envCreds;

  throw new Error('Twilio not configured - no connector or environment credentials found');
}

async function getTwilioClient() {
  const creds = await getCredentials();
  if (creds.source === 'connector') {
    return twilio(creds.authKey, creds.authSecret, { accountSid: creds.accountSid });
  }
  return twilio(creds.accountSid, creds.authSecret);
}

async function getTwilioFromPhoneNumber() {
  const creds = await getCredentials();
  return creds.phoneNumber;
}

export async function isSmsConfigured(): Promise<boolean> {
  try {
    const creds = await getCredentials();
    return !!(creds.accountSid && creds.authKey && creds.authSecret && creds.phoneNumber);
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
