# Archaeologist — Bản nâng cấp Code Inspector

## 1. Chạy dự án

Bản này dựa trên `ai-codebase-archaeologist-new.zip`. Không ghi đè `.env`, không xóa volume, không tự push GitHub. Sao lưu dự án hiện tại trước khi thay mã nguồn. Nên giải nén vào thư mục riêng để xem các thay đổi, sau đó chép đè mã nguồn vào đúng thư mục đang chạy (giữ `.git` và `.env` của máy). Nếu cần tạo bản độc lập, sao chép `.env.example` thành `.env` rồi điền thông số mới. Không commit secret.

PowerShell tại thư mục có `docker-compose.yml`:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=60 backend
Invoke-RestMethod http://localhost:8000/health
```

Mở http://localhost:3000. Nếu chạy bản mới ở thư mục khác, tránh trùng cổng với stack cũ; dùng cùng thư mục/project Compose để giữ dữ liệu. Không chạy `docker compose down -v`.

## 2. Sử dụng AI Soi Code

1. Đăng nhập và phân tích một kho GitHub công khai (Flask/Click là các ví dụ).
2. Trong kho mã, mở AI Soi Code. Chọn chế độ giám định, sửa câu hỏi nếu cần, nhấn Bắt đầu giám định. Chọn preset không tự gọi AI để tiết kiệm quota.
3. Nhấn Soi & sửa tại dòng trên một dẫn chứng. Trang Mã nguồn mở đúng tệp, commit SHA, dòng được highlight. Kết quả giám định vẫn giữ khi đổi tab.
4. Trong Xưởng sửa mã, nhập dòng đầu/cuối (1–200 dòng). Có thể soi đúng phạm vi đã chọn hoặc yêu cầu AI tạo đoạn thay thế. Sửa thủ công cũng hoạt động không cần LLM (vẫn cần đăng nhập).
5. Xem Before/After. Với Python, backend kiểm tra cú pháp AST của cả tệp; với ngôn ngữ khác chỉ kiểm tra phạm vi. Không tự chạy mã do AI sinh.
6. Xác nhận Áp dụng bản nháp, tải patch hoặc tệp đã chỉnh sửa. Bản nháp chỉ tồn tại trong giao diện hiện tại, không ghi đè snapshot hay kho GitHub.

Để đưa patch vào **bản clone của kho mã đang phân tích** (không phải kho Archaeologist trừ khi bạn đang phân tích chính Archaeologist):

```powershell
git status -sb
git rev-parse HEAD
# So sánh HEAD với SHA hiển thị trên trang. Nếu khác, dừng để kiểm tra.
git switch -c review/archaeologist-fix
git apply --check "C:\Users\YOUR_NAME\Downloads\archaeologist.patch"
git apply "C:\Users\YOUR_NAME\Downloads\archaeologist.patch"
git diff
```

Chỉ chạy lệnh apply khi check thành công; chạy test của kho mã, review rồi commit/push nhánh nếu có quyền. Tạo Pull Request trên GitHub từ nhánh đó. Chưa có chức năng tự tạo PR từ web hoặc chỉnh sửa kho từ xa.

## 3. Cấu hình AI

Dùng thông số từ tài khoản nhà cung cấp của bạn. Ví dụ cấu hình tương thích OpenAI của Gemini (tên model phải được tài khoản hỗ trợ):

```dotenv
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=YOUR_API_KEY
LLM_MODEL=gemini-2.5-flash
```

Sau khi đổi `.env`: `docker compose up -d --force-recreate backend`. HTTP 401: kiểm tra key; 403: quyền; 404: model/URL; 429: quota. Không trả raw body của provider hoặc key trên UI. Lỗi LLM không còn được gắn trạng thái phân tích thành công; dẫn chứng vẫn hiển thị. Không có đảm bảo mọi kết luận AI đúng.

## 4. Phạm vi thay đổi

- AI: preset, trạng thái, dẫn chứng, giữ kết quả khi mở tệp; phân tích phạm vi và tạo patch thật qua backend.
- Giao diện: CSS dùng chung, icon SVG, layout responsive, hỗ trợ 2 cột, bỏ quy trình lặp và các khối giới thiệu dư, giữ logo/màu và dark/light hiện có.
- Phụ thuộc: điều khiển zoom/reset/overview, mở tệp từ đồ thị và danh sách ảnh hưởng; đồ thị vẫn là quan hệ tĩnh đã lập chỉ mục, không bịa thêm cạnh.
- Nợ kỹ thuật: lọc mức độ/tên, giải thích tiếng Việt cho các loại phổ biến, gợi ý kiểm tra và điều hướng về tệp.
- Không đổi schema DB, giữ kiến trúc hiện tại. Chưa hoàn thiện GitHub write/PR, OAuth thực tế, kiểm thử trình duyệt, kiểm thử live LLM và đánh giá an ninh toàn hệ thống.

## 5. Kiểm thử

Backend: 47 kiểm thử đạt khi dùng SQLite trong môi trường kiểm tra (25 cảnh báo secret JWT của fixture test ngắn). Kiểm tra patch bằng `git apply --check` và `git apply` trên tệp thật. PostgreSQL/Docker không được kiểm tra tại đây do thiếu Docker/psycopg. Frontend chỉ kiểm tra cú pháp TypeScript; không build Next.js vì npm cache không có dependency và môi trường không tải được chúng. Hãy chạy build và smoke test trên máy bạn trước khi merge.

```powershell
docker compose exec backend python -m pytest -q
docker compose build frontend
```

Nếu image backend không chứa bộ test, chạy pytest trong thư mục backend với môi trường Python đã cài requirements. Sau build, kiểm tra đăng nhập, mở repo, giám định, dẫn chứng, sửa thủ công, AI đề xuất, tải patch, đồ thị, nợ kỹ thuật và chuyển ngôn ngữ.
