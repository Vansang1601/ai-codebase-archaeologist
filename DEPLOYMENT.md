# Hướng dẫn Triển khai Toàn diện (Production Deployment Guide)
## AI Codebase Archaeologist

Tài liệu này cung cấp quy trình từng bước để triển khai hệ thống **AI Codebase Archaeologist** lên môi trường sản xuất (VPS, Ubuntu Server, AWS EC2, DigitalOcean, Google Cloud Run).

---

## 1. Yêu cầu hệ thống (System Prerequisites)

- **Hệ điều hành:** Linux (khuyên dùng Ubuntu 22.04 LTS / 24.04 LTS) hoặc Windows Server có WSL2.
- **Phần cứng đề xuất:**
  - CPU: Tối thiểu 2 vCPU (khuyên dùng 4 vCPU để phân tích AST và repo lớn mượt mà).
  - RAM: Tối thiểu 4 GB (khuyên dùng 8 GB).
  - Disk: Tối thiểu 20 GB SSD khả dụng (để lưu trữ snapshot repo và PostgreSQL).
- **Phần mềm bắt buộc:**
  - Docker Engine 24.0+
  - Docker Compose v2.20+
  - Git 2.34+

---

## 2. Triển khai 1-Click (Automated 1-Click Deployment)

Chúng tôi đã chuẩn bị sẵn kịch bản tự động hóa toàn bộ quá trình:

### Trên Linux / macOS / VPS:
```bash
# Cấp quyền thực thi và chạy deploy script
chmod +x deploy.sh
./deploy.sh --prod
```

### Trên Windows PowerShell:
```powershell
.\deploy.ps1 -Prod
```

Script sẽ tự động:
1. Kiểm tra Docker và Docker Compose.
2. Tạo tệp `.env` an toàn nếu chưa tồn tại với chuỗi `AUTH_SECRET` bảo mật cao.
3. Build các container images (Next.js frontend, FastAPI backend, Parser-Worker).
4. Khởi chạy PostgreSQL và tự động thực thi các migration SQL (`V001` đến `V004`).
5. Kích hoạt Caddy Reverse Proxy với chứng chỉ SSL/TLS tự động (Let's Encrypt).

---

## 3. Cấu hình biến môi trường (`.env`)

Trước khi đưa vào vận hành thực tế, hãy chỉnh sửa các biến cốt lõi trong `.env`:

```ini
# Domain công khai của hệ thống (ví dụ: https://archaeologist.yourdomain.com)
PUBLIC_URL=https://archaeologist.yourdomain.com
CORS_ORIGINS=https://archaeologist.yourdomain.com
DOMAIN=archaeologist.yourdomain.com

# Chế độ sản xuất (ngăn chặn mọi hình thức dev login không an toàn)
ENVIRONMENT=production
ALLOW_DEV_LOGIN=false
AUTH_SECRET=<chuoi-ngau-nhien-64-bytes-base64>

# Giới hạn tần suất tấn công (Rate Limiting)
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_WINDOW_SECONDS=60
ALLOWED_EMAIL_DOMAINS=

# Cấu hình Google OAuth 2.0
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret

# Cấu hình GitHub OAuth App
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# Cấu hình AI / LLM (Google Gemini / OpenAI compatible)
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-2.5-flash
LLM_TIMEOUT_SECONDS=45
```

---

## 4. Cấu hình Nhà cung cấp Định danh OAuth (OAuth Identity Providers)

### 4.1. Google Cloud Console
1. Truy cập **Google Cloud Console** > **APIs & Services** > **Credentials**.
2. Chọn Client ID đã tạo.
3. Cập nhật **Authorized JavaScript origins**:
   - `https://archaeologist.yourdomain.com`
4. Cập nhật **Authorized redirect URIs**:
   - `https://archaeologist.yourdomain.com/api/auth/oauth/google/callback`
5. Nhấn **Save**.

### 4.2. GitHub Developer Settings
1. Truy cập **GitHub** > **Settings** > **Developer settings** > **OAuth Apps**.
2. Chọn ứng dụng của bạn.
3. Cập nhật **Homepage URL**: `https://archaeologist.yourdomain.com`
4. Cập nhật **Authorization callback URL**:
   - `https://archaeologist.yourdomain.com/api/auth/oauth/github/callback`
5. Nhấn **Update application**.

---

## 5. Kiến trúc Mạng & Bảo mật trong Môi trường Sản xuất

```text
[Internet Users]
       │
       ▼ (HTTPS :443 / HTTP :80)
┌──────────────┐
│ Caddy Proxy  │  <-- Tự động gia hạn chứng chỉ Let's Encrypt TLS
└──────┬───────┘
       │
       ├── /api/*, /health, /docs ────► [FastAPI Backend] (:8000)
       │                                     │
       │                                     ▼
       └── /* (All web routes)   ────► [Next.js Frontend] (:3000)
                                             │
                       [PostgreSQL 16] ◄─────┘
                         (Port 5432)
                       *Chỉ truy cập nội bộ trong Docker network*
                             ▲
                             │
                       [Parser Worker]
```

- **Cô lập CSDL:** PostgreSQL không mở cổng ra Internet (`ports` 5432 bị ẩn trên `docker-compose.prod.yml`), chỉ giao tiếp nội bộ trong mạng Docker bridge.
- **Bảo mật Cookie:** Cookie `session_token` có cờ `Secure=True`, `SameSite=Lax`, sống trong 7 ngày và được ký chữ ký điện tử HMAC-SHA256.
- **Giới hạn Log:** Toàn bộ container được cấu hình giới hạn kích thước log (`max-size: 20m`, `max-file: 3`), chống đầy ổ cứng máy chủ.

---

## 6. Lệnh Vận hành & Giám sát thường nhật

```bash
# Xem trạng thái các container đang chạy
docker compose -f docker-compose.prod.yml ps

# Xem nhật ký hoạt động realtime của backend
docker compose -f docker-compose.prod.yml logs -f backend

# Xem nhật ký phân tích của worker
docker compose -f docker-compose.prod.yml logs -f worker

# Kiểm tra sức khỏe hệ thống (Health Check)
curl -s https://archaeologist.yourdomain.com/health

# Khởi động lại toàn bộ stack
docker compose -f docker-compose.prod.yml restart

# Sao lưu cơ sở dữ liệu PostgreSQL
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U archaeologist archaeologist > backup_$(date +%F).sql
```
