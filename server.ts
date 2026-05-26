/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import { db, hashPassword, comparePassword, generateId } from './server/db';
import { UserRole, ClaimStatus, User } from './src/types';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hdxcloud_super_secret_jwt_key_9988';

app.use(express.json());

// Initialize Database connection on start
db.init().catch(err => {
  console.error('Failed to init DB:', err);
});

// Middleware to extract user from JWT
const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // Try cookie fallback
    const cookies = req.headers.cookie;
    if (cookies) {
      const match = cookies.match(/hdx_session=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await db.getUserById(decoded.userId);
    
    if (!user) {
      res.status(403).json({ error: 'User session invalid' });
      return;
    }

    if (user.is_banned) {
      res.status(403).json({ error: 'Your account has been suspended.' });
      return;
    }

    (req as any).user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Session expired or token modified' });
  }
};

// Middleware to verify admin access
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user as User;
  if (!user || user.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
};

// Client IP extractor
const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

// --- AUTH API ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  const ip = getClientIp(req);

  if (!username || !email || !password || !confirmPassword) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  // Password Rules
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({ 
      error: 'Password must be at least 8 characters long, contain an uppercase letter, and a number.' 
    });
    return;
  }

  try {
    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      res.status(400).json({ error: 'Email is already registered.' });
      return;
    }

    const users = await db.getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      res.status(400).json({ error: 'Username is already taken.' });
      return;
    }

    const password_hash = await hashPassword(password);
    const user = await db.createUser({
      username,
      email,
      password_hash,
      role: UserRole.USER,
      ip_address: ip
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Secure cookie setup
    res.setHeader('Set-Cookie', `hdx_session=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${7 * 24 * 3600}`);
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, created_at: user.created_at } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await db.getUserByEmail(email);
    if (!user || !user.password_hash) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.is_banned) {
      res.status(403).json({ error: 'Your account has been suspended.' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    // Update login history
    await db.updateUser(user.id, {
      last_login: new Date().toISOString(),
      ip_address: ip
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', `hdx_session=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${7 * 24 * 3600}`);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar, created_at: user.created_at } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// OAuth Callback & URL helpers
app.get('/api/auth/oauth-url', (req, res) => {
  const provider = req.query.provider as string;
  const redirectUri = `${req.query.origin || 'http://localhost:3000'}/auth/callback?provider=${provider}`;

  let authUrl = '';
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account'
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } else {
      // Return simulated link for seamless development preview
      authUrl = `/auth/callback?provider=google&simulated=true&email=${encodeURIComponent('googleuser_' + generateId().substring(0, 4) + '@gmail.com')}&username=GoogleCloudExplorer`;
    }
  } else if (provider === 'discord') {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (clientId) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify email'
      });
      authUrl = `https://discord.com/api/oauth2/authorize?${params}`;
    } else {
      // Return simulated link for seamless development preview
      authUrl = `/auth/callback?provider=discord&simulated=true&email=${encodeURIComponent('discorduser_' + generateId().substring(0, 4) + '@gmail.com')}&username=DiscordCoder`;
    }
  }

  res.json({ url: authUrl });
});

// Handle real and simulated callbacks
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const provider = req.query.provider as string;
  const simulated = req.query.simulated === 'true';
  const ip = getClientIp(req);

  try {
    let email = '';
    let username = '';
    let providerId = '';
    let avatar = '';

    if (simulated) {
      email = (req.query.email as string) || `user-${generateId()}@simulation.com`;
      username = (req.query.username as string) || 'SimulatedExplorer';
      providerId = 'sim-' + generateId();
      avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`;
    } else {
      const code = req.query.code as string;
      if (!code) {
        throw new Error('No authorization code provided');
      }

      const currentOrigin = `${req.protocol}://${req.get('host')}`;
      const redirectUri = `${currentOrigin}/auth/callback?provider=${provider}`;

      if (provider === 'google') {
        // Exchange code for Google Access Token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });

        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || 'Google token exchange failed');

        // Fetch user data
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userRes.json();
        
        email = userData.email;
        username = userData.name || userData.email.split('@')[0];
        providerId = userData.id;
        avatar = userData.picture || '';

      } else if (provider === 'discord') {
        // Exchange code for Discord Access Token
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.DISCORD_CLIENT_ID || '',
            client_secret: process.env.DISCORD_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });

        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || 'Discord token exchange failed');

        // Fetch user info
        const userRes = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userRes.json();

        email = userData.email || `${userData.username}@discord.com`;
        username = userData.username;
        providerId = userData.id;
        avatar = userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : '';
      }
    }

    // Lookup user or create one
    let user: User | null = null;
    if (provider === 'google') {
      user = await db.getUserByGoogleId(providerId);
    } else if (provider === 'discord') {
      user = await db.getUserByDiscordId(providerId);
    }

    // Fallback to looking up email
    if (!user) {
      user = await db.getUserByEmail(email);
    }

    if (user) {
      if (user.is_banned) {
        return res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Your account has been suspended.' }, '*');
                  window.close();
                } else {
                  window.location.href = '/?error=banned';
                }
              </script>
              <p style="color: red; font-family: sans-serif;">Your account has been suspended.</p>
            </body>
          </html>
        `);
      }

      // Update provider id
      const updates: Partial<User> = { last_login: new Date().toISOString(), ip_address: ip };
      if (provider === 'google' && !user.google_id) updates.google_id = providerId;
      if (provider === 'discord' && !user.discord_id) updates.discord_id = providerId;
      if (!user.avatar && avatar) updates.avatar = avatar;
      
      user = await db.updateUser(user.id, updates);
    } else {
      // Create new user for OAuth
      user = await db.createUser({
        username,
        email,
        google_id: provider === 'google' ? providerId : undefined,
        discord_id: provider === 'discord' ? providerId : undefined,
        avatar: avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        role: UserRole.USER,
        ip_address: ip
      });
    }

    if (!user) {
      throw new Error('Failed to create or update user context');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Send token and metadata back to parent window
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                token: '${token}',
                user: ${JSON.stringify({ 
                  id: user.id, 
                  username: user.username, 
                  email: user.email, 
                  role: user.role, 
                  avatar: user.avatar || '',
                  created_at: user.created_at 
                })}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #5865F2;">
            Authentication successful! Syncing session and closing...
          </p>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error('OAuth callback error:', err);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err.message || "Failed to authenticate"}' }, '*');
              window.close();
            } else {
              window.location.href = '/?error=' + encodeURIComponent('${err.message}');
            }
          </script>
          <p style="color: red; font-family: sans-serif; text-align: center; margin-top: 50px;">
            OAuth Error: ${err.message || 'Authentication failed'}
          </p>
        </body>
      </html>
    `);
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'hdx_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0');
  res.json({ success: true });
});

// Get self user context
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      is_banned: user.is_banned,
      created_at: user.created_at,
      last_login: user.last_login
    }
  });
});


// --- CLAIMS API ---

// Create claim
app.post('/api/claim/create', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const ip = getClientIp(req);

  try {
    const existingClaim = await db.getClaimByUserId(user.id);
    if (existingClaim && existingClaim.status !== ClaimStatus.CANCELLED) {
      res.status(400).json({ error: 'You already have an active or pending server claim request.' });
      return;
    }

    // Generate random distinct 6-digit code
    let codeStr = '';
    let isUnique = false;
    let attempts = 0;

    const claims = await db.getClaims();

    while (!isUnique && attempts < 20) {
      const codeNum = Math.floor(100000 + Math.random() * 900000);
      codeStr = codeNum.toString();
      isUnique = !claims.some(c => c.code === codeStr && c.status !== ClaimStatus.CANCELLED);
      attempts++;
    }

    const claim = await db.createClaim({
      user_id: user.id,
      code: codeStr,
      status: ClaimStatus.PENDING,
      ip_address: ip
    });

    res.status(201).json({ claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create server claim' });
  }
});

// Get claim status
app.get('/api/claim/status', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  try {
    const claim = await db.getClaimByUserId(user.id);
    res.json({ claim });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Cancel claim (Self user)
app.delete('/api/claim/cancel', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  try {
    const claim = await db.getClaimByUserId(user.id);
    if (!claim) {
      res.status(404).json({ error: 'No active claim found to cancel.' });
      return;
    }

    if (claim.status === ClaimStatus.APPROVED) {
      res.status(400).json({ error: 'Cannot cancel an already approved server request.' });
      return;
    }

    await db.updateClaim(claim.id, { status: ClaimStatus.CANCELLED });
    res.json({ success: true, message: 'Server claim cancelled successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Cancellation failed' });
  }
});


// --- NOTIFICATIONS API ---

// Get active user's notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  try {
    const notifications = await db.getNotificationsByUserId(user.id);
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// Mark notifications as read
app.put('/api/notifications/read', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  try {
    await db.markNotificationsRead(user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});


// --- ADMIN API ---

// Get users list
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.getUsers();
    // Return with security: omit hashed password
    const safeUsers = users.map(({ password_hash, ...rest }) => rest);
    res.json({ users: safeUsers });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users data.' });
  }
});

// Ban user
app.post('/api/admin/ban', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { userId } = req.body;
  const ip = getClientIp(req);

  try {
    const userToBan = await db.getUserById(userId);
    if (!userToBan) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (userToBan.role === UserRole.ADMIN) {
      res.status(400).json({ error: 'Administrators cannot be suspended.' });
      return;
    }

    await db.updateUser(userId, { is_banned: true });
    
    // Add audit log
    await db.createAuditLog({
      admin_id: admin.id,
      action: 'User Banned',
      target_user: userToBan.username,
      ip
    });

    res.json({ success: true, message: `Account for ${userToBan.username} has been suspended.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Operation failed.' });
  }
});

// Unban user
app.post('/api/admin/unban', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { userId } = req.body;
  const ip = getClientIp(req);

  try {
    const user = await db.getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    await db.updateUser(userId, { is_banned: false });

    // Add audit log
    await db.createAuditLog({
      admin_id: admin.id,
      action: 'User Unbanned',
      target_user: user.username,
      ip
    });

    res.json({ success: true, message: `Account for ${user.username} has been reactivated.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Operation failed.' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { id } = req.params;
  const ip = getClientIp(req);

  try {
    const targetUser = await db.getUserById(id);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (targetUser.role === UserRole.ADMIN) {
      res.status(400).json({ error: 'Administrators cannot be deleted' });
      return;
    }

    await db.deleteUser(id);

    await db.createAuditLog({
      admin_id: admin.id,
      action: 'User Deleted',
      target_user: targetUser.username,
      ip
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Fail to delete user' });
  }
});

// Fetch all claims (admin view)
app.get('/api/admin/claims', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const claims = await db.getClaims();
    res.json({ claims });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve server claims.' });
  }
});

// Delete claim (admin action)
app.delete('/api/admin/claims/:id', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { id } = req.params;
  const ip = getClientIp(req);

  try {
    const claim = await db.getClaimById(id);
    if (!claim) {
      res.status(404).json({ error: 'Claim details not found.' });
      return;
    }
    const target = await db.getUserById(claim.user_id);
    await db.deleteClaim(id);

    await db.createAuditLog({
      admin_id: admin.id,
      action: 'Claim Deleted',
      target_user: target?.username || 'Unknown User',
      ip
    });

    res.json({ success: true, message: 'Claim record deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// Approve server claim (single or bulk array)
app.post('/api/admin/approve', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { claimIds } = req.body; // Expects array of IDs
  const ip = getClientIp(req);

  if (!claimIds || !Array.isArray(claimIds)) {
    res.status(400).json({ error: 'Invalid parameters. List of claim IDs is required.' });
    return;
  }

  const settings = await db.getSettings();

  try {
    const results = [];
    for (const claimId of claimIds) {
      const claim = await db.getClaimById(claimId);
      if (!claim) continue;

      if (claim.status !== ClaimStatus.APPROVED) {
        await db.updateClaim(claimId, {
          status: ClaimStatus.APPROVED,
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.username
        });

        // Send approval message notification to the user
        await db.createNotification({
          user_id: claim.user_id,
          title: 'Server Claim Approved',
          message: 'Your free server request has been approved. Please join our Discord server and provide your claim code to receive your server.'
        });

        const targetUser = await db.getUserById(claim.user_id);
        const username = targetUser?.username || 'HDX Explorer';

        // Add to audit logs
        await db.createAuditLog({
          admin_id: admin.id,
          action: 'Claim Approved',
          target_user: username,
          ip
        });

        // Fire Discord Webhook
        if (settings.discord_webhook_url) {
          try {
            await fetch(settings.discord_webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                embeds: [{
                  title: "🚀 Claim Request Approved",
                  color: 5814783, // #5865F2 (Burple)
                  fields: [
                    { name: "Username", value: username, inline: true },
                    { name: "Claim Code", value: `\`${claim.code}\``, inline: true },
                    { name: "Server Invite", value: settings.discord_invite || "https://discord.gg/hdxcloud" },
                    { name: "Status", value: "Approved", inline: true }
                  ],
                  timestamp: new Date().toISOString(),
                  footer: { text: "HDX Cloud System" }
                }]
              })
            });
          } catch (hookErr) {
            console.error('Discord webhook dispatch failure:', hookErr);
          }
        }
        
        results.push(claimId);
      }
    }
    res.json({ success: true, processed: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed during claim approvals bulk loop.' });
  }
});

// Reject server claim (single or bulk array)
app.post('/api/admin/reject', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { claimIds } = req.body;
  const ip = getClientIp(req);

  if (!claimIds || !Array.isArray(claimIds)) {
    res.status(400).json({ error: 'Invalid parameters.' });
    return;
  }

  try {
    const results = [];
    for (const claimId of claimIds) {
      const claim = await db.getClaimById(claimId);
      if (!claim) continue;

      if (claim.status !== ClaimStatus.REJECTED) {
        await db.updateClaim(claimId, {
          status: ClaimStatus.REJECTED,
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.username
        });

        // Send rejection notification
        await db.createNotification({
          user_id: claim.user_id,
          title: 'Server Claim Rejected',
          message: 'Unfortunately your request was rejected.'
        });

        const targetUser = await db.getUserById(claim.user_id);
        const username = targetUser?.username || 'HDX Explorer';

        // Add audit logs
        await db.createAuditLog({
          admin_id: admin.id,
          action: 'Claim Rejected',
          target_user: username,
          ip
        });

        results.push(claimId);
      }
    }
    res.json({ success: true, processed: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed in claim rejection loop.' });
  }
});

// Get administrator statistics
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await db.getStatistics();
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile stats reports.' });
  }
});

// Get Audit Logs list
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await db.getAuditLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile audit logs.' });
  }
});

// Get platform settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// Update platform settings
app.post('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  const { discord_invite, discord_webhook_url } = req.body;
  const admin = (req as any).user as User;
  const ip = getClientIp(req);

  try {
    const updated = await db.updateSettings({ discord_invite, discord_webhook_url });
    
    await db.createAuditLog({
      admin_id: admin.id,
      action: 'Settings Updated',
      target_user: 'System Configuration',
      ip
    });

    res.json({ settings: updated });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to update system settings' });
  }
});

// Send custom system notification (Admin capability)
app.post('/api/admin/send-notification', authenticateToken, requireAdmin, async (req, res) => {
  const { userId, title, message } = req.body;
  const admin = (req as any).user as User;
  const ip = getClientIp(req);

  if (!userId || !title || !message) {
    res.status(400).json({ error: 'Recipient userId, title, and message are required' });
    return;
  }

  try {
    const targetUser = await db.getUserById(userId);
    if (!targetUser) {
      res.status(404).json({ error: 'Recipient user not found' });
      return;
    }

    const notif = await db.createNotification({
      user_id: userId,
      title,
      message
    });

    await db.createAuditLog({
      admin_id: admin.id,
      action: `Sent Custom Notification: "${title}"`,
      target_user: targetUser.username,
      ip
    });

    res.status(201).json({ notification: notif });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to submit notification' });
  }
});


// --- VITE DEV MIDDLEWARE AND STATIC SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA Fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HDX Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
