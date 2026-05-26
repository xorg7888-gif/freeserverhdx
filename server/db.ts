/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { User, UserRole, Claim, ClaimStatus, Notification, AuditLog, AppSettings, DashboardStats } from '../src/types';

// We will store our local fallback database here
const DATA_DIR = path.join(process.cwd(), 'data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db.json');

// Interface to represent the full JSON structure
interface JsonDatabase {
  users: User[];
  claims: Claim[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  settings: AppSettings;
}

// Global Postgres Pool
let pgPool: pg.Pool | null = null;
const isPg = !!process.env.DATABASE_URL;

// Helper to secure password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Function to generate short ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// JSON DB state
let localDb: JsonDatabase = {
  users: [],
  claims: [],
  notifications: [],
  auditLogs: [],
  settings: {
    discord_invite: 'https://discord.gg/hdxcloud',
    discord_webhook_url: ''
  }
};

function saveLocalDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(localDb, null, 2), 'utf-8');
}

function loadLocalDb() {
  if (fs.existsSync(JSON_DB_PATH)) {
    try {
      const data = fs.readFileSync(JSON_DB_PATH, 'utf-8');
      localDb = JSON.parse(data);
    } catch (e) {
      console.error("Error reading JSON database, resetting...", e);
      saveLocalDb();
    }
  } else {
    saveLocalDb();
  }
}

export const db = {
  async init() {
    console.log(`[DB] Initializing. SQL Mode: ${isPg ? 'PostgreSQL' : 'JSON File Fallback'}`);
    
    if (isPg) {
      try {
        pgPool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
        });
        
        // Execute DDL Setup for Postgres
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            discord_id VARCHAR(100),
            google_id VARCHAR(100),
            avatar VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user',
            is_banned BOOLEAN DEFAULT FALSE,
            ip_address VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS claims (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
            code VARCHAR(100) UNIQUE NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            ip_address VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            reviewed_by VARCHAR(50)
          );

          CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(50) PRIMARY KEY,
            admin_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
            action VARCHAR(255) NOT NULL,
            target_user VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip VARCHAR(100)
          );

          CREATE TABLE IF NOT EXISTS settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);
        
        // Seed database settings & admin if empty
        const userCountRes = await pgPool.query('SELECT COUNT(*) FROM users');
        const count = parseInt(userCountRes.rows[0].count, 10);
        
        if (count === 0) {
          const adminPassHash = await hashPassword('adminhdxcloud');
          const adminId = generateId();
          await pgPool.query(
            `INSERT INTO users (id, username, email, password_hash, role, is_banned, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [adminId, 'Admin', 'hdxcloud@admin.com', adminPassHash, UserRole.ADMIN, false]
          );
          console.log('[DB] PostgreSQL Admin seeded successfully.');
        }

        // Install default settings
        await pgPool.query(`
          INSERT INTO settings (key, value) VALUES ('discord_invite', 'https://discord.gg/hdxcloud') ON CONFLICT DO NOTHING;
          INSERT INTO settings (key, value) VALUES ('discord_webhook_url', '') ON CONFLICT DO NOTHING;
        `);

        console.log('[DB] PostgreSQL initialization complete.');
      } catch (err) {
        console.error('[DB] PostgreSQL init failed, falling back to JSON Mode...', err);
        process.env.DATABASE_URL = ''; // Clear so query handlers use fallback JSON
        this.initLocal();
      }
    } else {
      this.initLocal();
    }
  },

  async initLocal() {
    loadLocalDb();
    
    // Check if admin user exists, if not seed it.
    let admin = localDb.users.find(u => u.email === 'hdxcloud@admin.com' || u.role === UserRole.ADMIN);
    if (!admin) {
      const adminPassHash = await hashPassword('adminhdxcloud');
      admin = {
        id: 'admin-id-123456',
        username: 'Admin',
        email: 'hdxcloud@admin.com',
        password_hash: adminPassHash,
        role: UserRole.ADMIN,
        is_banned: false,
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDb.users.push(admin);
      
      // Let's seed some beautiful sample data so the dashboard is alive!
      const user1: User = {
        id: 'u1',
        username: 'cloudrider',
        email: 'rider@hdx.io',
        role: UserRole.USER,
        is_banned: false,
        ip_address: '198.51.100.42',
        created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      };
      const user2: User = {
        id: 'u2',
        username: 'pixelperfect',
        email: 'pixel@hdx.io',
        role: UserRole.USER,
        is_banned: false,
        ip_address: '203.0.113.88',
        created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
      };
      const user3: User = {
        id: 'u3',
        username: 'banneduser',
        email: 'banned@cheater.com',
        role: UserRole.USER,
        is_banned: true,
        ip_address: '185.120.30.5',
        created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      };
      
      localDb.users.push(user1, user2, user3);

      // Seed sample claims
      localDb.claims.push({
        id: 'c1',
        user_id: 'u1',
        code: '120594',
        status: ClaimStatus.APPROVED,
        ip_address: '198.51.100.42',
        created_at: new Date(Date.now() - 2.5 * 24 * 3600 * 1000).toISOString(),
        reviewed_at: new Date(Date.now() - 2.4 * 24 * 3600 * 1000).toISOString(),
        reviewed_by: 'Admin'
      });

      localDb.claims.push({
        id: 'c2',
        user_id: 'u2',
        code: '774190',
        status: ClaimStatus.PENDING,
        ip_address: '203.0.113.88',
        created_at: new Date(Date.now() - 0.5 * 24 * 3600 * 1000).toISOString()
      });

      // Seed notifications
      localDb.notifications.push({
        id: 'n1',
        user_id: 'u1',
        title: 'Server Request Approved',
        message: 'Your free server request has been approved. Please join our Discord server and provide your claim code to receive your server.',
        is_read: false,
        created_at: new Date(Date.now() - 2.4 * 24 * 3600 * 1000).toISOString()
      });

      // Seed audit logs
      localDb.auditLogs.push({
        id: 'a1',
        admin_id: 'admin-id-123456',
        action: 'Claim Approved',
        target_user: 'cloudrider',
        timestamp: new Date(Date.now() - 2.4 * 24 * 3600 * 1000).toISOString(),
        ip: '127.0.0.1'
      }, {
        id: 'a2',
        admin_id: 'admin-id-123456',
        action: 'User Banned',
        target_user: 'banneduser',
        timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        ip: '127.0.0.1'
      });

      saveLocalDb();
      console.log('[DB] Local JSON DB initialized and beautiful sample data seeded.');
    } else {
      console.log('[DB] Local JSON DB loaded.');
    }
  },

  // Users CRUD
  async getUsers(): Promise<User[]> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM users ORDER BY created_at DESC');
      return res.rows;
    }
    return [...localDb.users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getUserById(id: string): Promise<User | null> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return localDb.users.find(u => u.id === id) || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      return res.rows[0] || null;
    }
    return localDb.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
      return res.rows[0] || null;
    }
    return localDb.users.find(u => u.google_id === googleId) || null;
  },

  async getUserByDiscordId(discordId: string): Promise<User | null> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
      return res.rows[0] || null;
    }
    return localDb.users.find(u => u.discord_id === discordId) || null;
  },

  async createUser(user: Partial<User>): Promise<User> {
    const fresh: User = {
      id: user.id || generateId(),
      username: user.username || 'User',
      email: user.email || '',
      password_hash: user.password_hash,
      discord_id: user.discord_id,
      google_id: user.google_id,
      avatar: user.avatar,
      role: user.role || UserRole.USER,
      is_banned: false,
      ip_address: user.ip_address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (pgPool) {
      await pgPool.query(
        `INSERT INTO users (id, username, email, password_hash, discord_id, google_id, avatar, role, is_banned, ip_address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          fresh.id,
          fresh.username,
          fresh.email,
          fresh.password_hash,
          fresh.discord_id,
          fresh.google_id,
          fresh.avatar,
          fresh.role,
          fresh.is_banned,
          fresh.ip_address,
          fresh.created_at,
          fresh.updated_at
        ]
      );
      return fresh;
    }

    localDb.users.push(fresh);
    saveLocalDb();
    return fresh;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (pgPool) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.getUserById(id);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const values = keys.map(k => (updates as any)[k]);
      
      await pgPool.query(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id, ...values]
      );
      return this.getUserById(id);
    }

    const idx = localDb.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    localDb.users[idx] = {
      ...localDb.users[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveLocalDb();
    return localDb.users[idx];
  },

  async deleteUser(id: string): Promise<boolean> {
    if (pgPool) {
      const res = await pgPool.query('DELETE FROM users WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }
    const len = localDb.users.length;
    localDb.users = localDb.users.filter(u => u.id !== id);
    if (localDb.users.length !== len) {
      localDb.claims = localDb.claims.filter(c => c.user_id !== id);
      localDb.notifications = localDb.notifications.filter(n => n.user_id !== id);
      saveLocalDb();
      return true;
    }
    return false;
  },

  // Claims
  async getClaims(): Promise<Claim[]> {
    if (pgPool) {
      const res = await pgPool.query(`
        SELECT c.*, u.username, u.email 
        FROM claims c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
      `);
      return res.rows;
    }
    
    return localDb.claims.map(claim => {
      const user = localDb.users.find(u => u.id === claim.user_id);
      return {
        ...claim,
        username: user?.username || 'Unknown',
        email: user?.email || 'Unknown'
      };
    }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getClaimByUserId(userId: string): Promise<Claim | null> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM claims WHERE user_id = $1', [userId]);
      return res.rows[0] || null;
    }
    return localDb.claims.find(c => c.user_id === userId) || null;
  },

  async getClaimById(id: string): Promise<Claim | null> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM claims WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return localDb.claims.find(c => c.id === id) || null;
  },

  async createClaim(claim: Partial<Claim>): Promise<Claim> {
    const fresh: Claim = {
      id: claim.id || generateId(),
      user_id: claim.user_id || '',
      code: claim.code || '',
      status: claim.status || ClaimStatus.PENDING,
      ip_address: claim.ip_address || '127.0.0.1',
      created_at: new Date().toISOString()
    };

    if (pgPool) {
      await pgPool.query(
        `INSERT INTO claims (id, user_id, code, status, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fresh.id, fresh.user_id, fresh.code, fresh.status, fresh.ip_address, fresh.created_at]
      );
      return fresh;
    }

    localDb.claims.push(fresh);
    saveLocalDb();
    return fresh;
  },

  async updateClaim(id: string, updates: Partial<Claim>): Promise<Claim | null> {
    if (pgPool) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.getClaimById(id);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const values = keys.map(k => (updates as any)[k]);
      await pgPool.query(`UPDATE claims SET ${setClause} WHERE id = $1`, [id, ...values]);
      return this.getClaimById(id);
    }

    const idx = localDb.claims.findIndex(c => c.id === id);
    if (idx === -1) return null;
    localDb.claims[idx] = {
      ...localDb.claims[idx],
      ...updates
    };
    saveLocalDb();
    return localDb.claims[idx];
  },

  async deleteClaim(id: string): Promise<boolean> {
    if (pgPool) {
      const res = await pgPool.query('DELETE FROM claims WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }
    const len = localDb.claims.length;
    localDb.claims = localDb.claims.filter(c => c.id !== id);
    if (localDb.claims.length !== len) {
      saveLocalDb();
      return true;
    }
    return false;
  },

  // Notifications
  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return res.rows;
    }
    return localDb.notifications
      .filter(n => n.user_id === userId)
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createNotification(notif: Partial<Notification>): Promise<Notification> {
    const fresh: Notification = {
      id: notif.id || generateId(),
      user_id: notif.user_id || '',
      title: notif.title || '',
      message: notif.message || '',
      is_read: false,
      created_at: new Date().toISOString()
    };

    if (pgPool) {
      await pgPool.query(
        `INSERT INTO notifications (id, user_id, title, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fresh.id, fresh.user_id, fresh.title, fresh.message, fresh.is_read, fresh.created_at]
      );
      return fresh;
    }

    localDb.notifications.push(fresh);
    saveLocalDb();
    return fresh;
  },

  async markNotificationsRead(userId: string): Promise<boolean> {
    if (pgPool) {
      await pgPool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
      return true;
    }
    localDb.notifications.forEach(n => {
      if (n.user_id === userId) n.is_read = true;
    });
    saveLocalDb();
    return true;
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM settings');
      const settings: Partial<AppSettings> = {};
      res.rows.forEach(row => {
        (settings as any)[row.key] = row.value;
      });
      return {
        discord_invite: settings.discord_invite || 'https://discord.gg/hdxcloud',
        discord_webhook_url: settings.discord_webhook_url || ''
      };
    }
    return { ...localDb.settings };
  },

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    if (pgPool) {
      for (const [key, val] of Object.entries(updates)) {
        await pgPool.query(
          `INSERT INTO settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, val]
        );
      }
      return this.getSettings();
    }

    localDb.settings = {
      ...localDb.settings,
      ...updates
    };
    saveLocalDb();
    return { ...localDb.settings };
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    if (pgPool) {
      const res = await pgPool.query(`
        SELECT a.*, u.username as admin_username
        FROM audit_logs a
        JOIN users u ON a.admin_id = u.id
        ORDER BY a.timestamp DESC
      `);
      return res.rows;
    }
    return localDb.auditLogs.map(log => {
      const admin = localDb.users.find(u => u.id === log.admin_id);
      return {
        ...log,
        admin_username: admin?.username || 'System'
      };
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async createAuditLog(log: Partial<AuditLog>): Promise<AuditLog> {
    const fresh: AuditLog = {
      id: log.id || generateId(),
      admin_id: log.admin_id || '',
      action: log.action || '',
      target_user: log.target_user || '',
      timestamp: new Date().toISOString(),
      ip: log.ip || '127.0.0.1'
    };

    if (pgPool) {
      await pgPool.query(
        `INSERT INTO audit_logs (id, admin_id, action, target_user, timestamp, ip)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fresh.id, fresh.admin_id, fresh.action, fresh.target_user, fresh.timestamp, fresh.ip]
      );
      return fresh;
    }

    localDb.auditLogs.push(fresh);
    saveLocalDb();
    return fresh;
  },

  // General statistics aggregator
  async getStatistics(): Promise<DashboardStats> {
    const users = await this.getUsers();
    const claims = await this.getClaims();

    const totalUsers = users.length;
    const totalClaims = claims.length;
    const pendingClaims = claims.filter(c => c.status === ClaimStatus.PENDING).length;
    const approvedClaims = claims.filter(c => c.status === ClaimStatus.APPROVED).length;
    const rejectedClaims = claims.filter(c => c.status === ClaimStatus.REJECTED).length;
    const bannedUsers = users.filter(u => u.is_banned).length;

    // Daily registrations for last 7 days including today
    const dailyRegistrations: { date: string; count: number }[] = [];
    const claimActivity: { date: string; status: string; count: number }[] = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      
      const userCount = users.filter(u => u.created_at.startsWith(dateStr)).length;
      dailyRegistrations.push({ date: dateStr, count: userCount });

      // Claims count for this day
      const approvedCount = claims.filter(c => c.created_at.startsWith(dateStr) && c.status === ClaimStatus.APPROVED).length;
      const rejectedCount = claims.filter(c => c.created_at.startsWith(dateStr) && c.status === ClaimStatus.REJECTED).length;
      const pendingCount = claims.filter(c => c.created_at.startsWith(dateStr) && c.status === ClaimStatus.PENDING).length;

      claimActivity.push(
        { date: dateStr, status: 'Approved', count: approvedCount },
        { date: dateStr, status: 'Rejected', count: rejectedCount },
        { date: dateStr, status: 'Pending', count: pendingCount }
      );
    }

    return {
      totalUsers,
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      bannedUsers,
      dailyRegistrations,
      claimActivity
    };
  }
};
