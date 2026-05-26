# HDX Cloud - Free Server Claim Platform Deployment Manual

This document provides zero-fuss, complete deployment steps to host your **HDX Cloud Server Claim Platform** on an Ubuntu VPS using Docker, Docker Compose, Nginx, and automated Let's Encrypt SSL.

---

## 📋 Architectural Overview

The application adopts a high-efficiency **Full-Stack CJS Bundle Architecture**:
- **Frontend / Client**: React 19 + Tailwind CSS + Framer Motion. Compiled into static standard SPA assets in `/dist`.
- **Backend / API**: Fast Node.js Express server running on port `3000`. Inside production, esbuild bundles server controllers into a single `/dist/server.cjs` executing cleanly bypassing dynamic file imports blocks.
- **Reverse Proxy**: Nginx container acts as a public-facing TLS reverse proxy, routing standard client requests to our combined App server.
- **Relational Storage**: PostgreSQL container configured with high reliability. When `DATABASE_URL` is configured, schemas migrate on first boot. When omitted, it falls back to a sandbox-compliant JSON File Database (`/data/db.json`) allowing effortless pre-deployment local testing.

---

## ⚡ VPS Setup & OS Handshake

SSH into your freshly provisioned Ubuntu VPS and configure security, firewalls, and updates.

### 1. Update Ubuntu Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Set Up Swap Partition (Recommended for 1GB/2GB RAM Droplets)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Setup Firewall (UFW)
Open public incoming gateways for HTTP (80), HTTPS (443), and your secure SSH port.
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## 🐳 Docker & Compose Engine Setup

Equip your VPS host with standard Docker and Docker Compose engines.

### 1. Install Docker
```bash
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
```

### 2. Verify Docker Status & Auto Restart
```bash
sudo systemctl status docker --no-pager
sudo systemctl enable docker
```

### 3. Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

---

## 🌐 Domain Configuration & nginx

Configure DNS mapping in your domain registry.
1. Add an **A Record** pointing your domain name (e.g., `hdxcloud.com`) to the VPS Public IP Address.
2. Add a **CNAME Record** for `www.hdxcloud.com` pointing to `@` (your primary host).

### 2. Modify Nginx configuration
Open `/app/nginx.conf` or your host deployment folder, and replace `localhost` with your actual domain record.
```nginx
    server {
        listen 80;
        server_name hdxcloud.com www.hdxcloud.com;
        ...
```

---

## 🔒 Automated Let's Encrypt SSL Configuration

Execute this sequence to lock and secure your VPS under grade-A TLS certificates.

### 1. Boot up Nginx in HTTP Mode
To request certificate handshakes, Nginx must serve challenge headers publicly. Start Nginx and your application stack:
```bash
docker-compose up -d Nginx database APP
```

### 2. Request SSL Certificate
Execute Certbot directly against your running containers. Replace the emails and domains with your real specs:
```bash
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email xorg7888@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d hdxcloud.com -d www.hdxcloud.com
```

### 3. Secure Nginx under SSL (Modify nginx.conf)
Once certificates compile inside `/etc/letsencrypt/`, update `nginx.conf` to direct 443 routes securely. Move this config in place of standard HTTP `server` block:

```nginx
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    
    server {
        listen 80;
        server_name hdxcloud.com www.hdxcloud.com;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name hdxcloud.com www.hdxcloud.com;

        ssl_certificate /etc/letsencrypt/live/hdxcloud.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/hdxcloud.com/privkey.pem;

        location / {
            proxy_pass http://backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 4. Recock Nginx and Reload
```bash
docker-compose restart nginx
```

---

## 🚀 Active Production Deployment

Deploy the combined full-stack image cleanly in background mode.

### 1. Configure the Production Environment (`.env`)
Create an active `.env` file containing secrets at your deployment dir:
```env
# Database Connections
DATABASE_URL="postgresql://hdx_admin:hdx_secure_pass_9944@postgres:5432/hdxcloud?sslmode=disable"
JWT_SECRET="YOUR_HDX_SECURE_GENERATED_JWT_KEY"

# OAuth clearance integration keys (Google Developers Dashboard / Discord Developer Portal)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_CLIENT_SECRET="your_discord_client_secret"

# Default Admin parameters (Seeded on first boot automatically)
ADMIN_EMAIL="hdxcloud@admin.com"
ADMIN_PASSWORD="adminhdxcloud"
```

### 2. Fire Up Stack
```bash
docker-compose up -d --build
```

---

## 💾 Fail-safe Daily Backup Strategy

To ensure zero database loss, create a weekly cron job performing logic backups of your PG volumes.

### 1. Create Backup Script (`/opt/backup-hdx.sh`)
```bash
mkdir -p /opt/backups
BACKUP_NAME="/opt/backups/hdxcloud-pg-backup-$(date +%Y-%m-%d-%H-%M).sql"
docker exec hdx_postgres pg_dumpall -U hdx_admin > "$BACKUP_NAME"
# Prune backups older than 14 days
find /opt/backups/ -type f -name "*.sql" -mtime +14 -exec rm {} \;
```

### 2. Schedule Cron Loop
```bash
sudo chmod +x /opt/backup-hdx.sh
# Open host Crontab
sudo crontab -e
```
Add this rule at the bottom to trigger database exports daily at midnight:
```cron
0 0 * * * /opt/backup-hdx.sh >> /var/log/hdx-backup.log 2>&1
```

---

## 🛡️ Administrative Defaults & Security Clearence

- **Admin Control Deck Credentials:**
  - **Email:** `hdxcloud@admin.com`
  - **Password:** `adminhdxcloud`
- **Security Checkpoints Included:**
  - Automated JWT parsing with Secure, HTTP-Only, SameSite=None, and Secure-Iff cookies.
  - Salted and hashed passwords using bcryptjs.
  - Multi-user claims validation and duplicate entry checks.
  - IP Address recording and tracking of malicious applicants.
  - Full administrator audit log of bans, deletes, and clearance approvals.
