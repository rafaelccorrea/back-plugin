import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { generateApiKey } from "../services/tokenService";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/oauth/google/callback';

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Exchange Google authorization code for access token and user info
 */
async function getGoogleUserInfo(code: string): Promise<{
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}> {
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[GoogleOAuth] Token exchange failed:', error);
      throw new Error('Failed to exchange Google authorization code');
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const error = await userInfoResponse.text();
      console.error('[GoogleOAuth] User info fetch failed:', error);
      throw new Error('Failed to fetch Google user info');
    }

    const userInfo = await userInfoResponse.json();

    return {
      googleId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      emailVerified: userInfo.verified_email || false,
    };
  } catch (error) {
    console.error('[GoogleOAuth] Error getting user info:', error);
    throw error;
  }
}

/**
 * Register Google OAuth routes
 */
export function registerGoogleOAuthRoutes(app: Express) {
  /**
   * Initiate Google OAuth flow
   * GET /api/oauth/google
   */
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    if (!GOOGLE_CLIENT_ID) {
      res.status(500).json({ error: "Google OAuth not configured" });
      return;
    }

    const redirectUri = GOOGLE_CALLBACK_URL;
    const scope = 'openid email profile';
    
    // Store the original URL to redirect back after auth
    const state = Buffer.from(req.query.returnTo as string || '/').toString('base64');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    res.redirect(authUrl.toString());
  });

  /**
   * Google OAuth callback
   * GET /api/oauth/google/callback
   */
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error('[GoogleOAuth] OAuth error:', error);
      res.redirect(`/?error=google_oauth_failed`);
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    try {
      // Get user info from Google
      const googleUser = await getGoogleUserInfo(code);

      if (!googleUser.email) {
        res.status(400).json({ error: "Email not provided by Google" });
        return;
      }

      // Check if user exists by email or googleId
      let user = await db.getUserByEmail(googleUser.email);
      
      if (!user) {
        // Check by googleId
        user = await db.getUserByGoogleId(googleUser.googleId);
      }

      if (user) {
        // User exists, update their info
        await db.updateUser(user.id, {
          googleId: googleUser.googleId,
          name: googleUser.name || user.name,
          loginMethod: 'google',
          emailVerified: googleUser.emailVerified || user.emailVerified,
          lastSignedIn: new Date(),
        });
      } else {
        // Create new user
        const newUser = await db.createUser({
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.googleId,
          loginMethod: 'google',
          emailVerified: googleUser.emailVerified,
          apiKey: generateApiKey(),
          role: 'user',
        });
        user = newUser;
      }

      // Create session token using Manus SDK
      const sessionToken = await sdk.createSessionToken(user.id.toString(), {
        name: user.name || user.email || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to original destination or home
      const returnTo = state ? Buffer.from(state, 'base64').toString() : '/';
      res.redirect(returnTo);
    } catch (error) {
      console.error("[GoogleOAuth] Callback failed", error);
      res.redirect(`/?error=google_oauth_failed`);
    }
  });
}
