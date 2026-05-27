import axios from "axios";

const ZOOM_ACCOUNT_ID = String(process.env.ZOOM_ACCOUNT_ID || "").trim();
const ZOOM_CLIENT_ID = String(process.env.ZOOM_CLIENT_ID || "").trim();
const ZOOM_CLIENT_SECRET = String(process.env.ZOOM_CLIENT_SECRET || "").trim();
const ZOOM_HOST_EMAIL = String(process.env.ZOOM_HOST_EMAIL || "").trim(); // optional

let cachedToken = null;
let tokenExpiresAt = 0;

const getAccessToken = async () => {
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Zoom credentials (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET) are not configured");
  }

  const now = Date.now();
  if (cachedToken && tokenExpiresAt - 60000 > now) {
    return cachedToken;
  }

  try {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");

    const url = "https://zoom.us/oauth/token?grant_type=account_credentials";

    const params = new URLSearchParams();
    params.append("account_id", ZOOM_ACCOUNT_ID);

    const resp = await axios.post(url, params.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });

    const data = resp.data || {};
    if (!data.access_token) throw new Error("No access_token returned from Zoom");

    cachedToken = data.access_token;
    tokenExpiresAt = now + (Number(data.expires_in || 3600) * 1000);
    return cachedToken;
  } catch (err) {
    throw new Error(`Failed to obtain Zoom access token: ${err.response?.data?.message || err.message}`);
  }
};

export const createMeeting = async ({ topic = "Meeting", startTime, durationMinutes = 30, hostEmail = "" , timezone = "Asia/Kolkata" } = {}) => {
  try {
    const token = await getAccessToken();
    const preferredUser = (hostEmail && String(hostEmail).trim()) || ZOOM_HOST_EMAIL || null;

    const payload = {
      topic: String(topic || "Zoom Meeting"),
      type: 2, // Scheduled meeting
      start_time: new Date(startTime).toISOString(),
      duration: Number(durationMinutes) || 30,
      timezone,
      settings: {
        join_before_host: false,
        approval_type: 0,
        mute_upon_entry: true,
      },
    };

    const tryCreate = async (userId) => {
      const url = `https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`;
      const resp = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
      return resp.data;
    };

    // First try preferred user if available
    if (preferredUser) {
      try {
        return await tryCreate(preferredUser);
      } catch (err) {
        // If user not found (404) or forbidden, we'll fallback to finding an account user
        const status = err.response?.status;
        const data = err.response?.data;
        // Only log and continue to fallback for user-related errors
        if (![400, 401, 403, 404].includes(status)) {
          throw err;
        }
        // proceed to fallback below
        // eslint-disable-next-line no-console
        console.warn(`createMeeting: preferred user create failed (${status}):`, data || err.message);
      }
    }

    // Fallback: fetch account users and pick first suitable user
    try {
      const usersResp = await axios.get(`https://api.zoom.us/v2/users`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const users = Array.isArray(usersResp.data?.users) ? usersResp.data.users : [];
      if (!users.length) {
        throw new Error("No Zoom users found in account to create meeting");
      }

      // prefer a user with hostEmail if present
      const chosen = users.find((u) => preferredUser && u.email === preferredUser) || users[0];
      return await tryCreate(chosen.email || chosen.id || chosen.user_id || chosen.email);
    } catch (err) {
      const msg = err.response?.data || err.message || String(err);
      throw new Error(`Zoom createMeeting failed: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
  } catch (err) {
    const msg = err.response?.data || err.message || String(err);
    throw new Error(`Zoom createMeeting failed: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
};

export default { getAccessToken, createMeeting };
