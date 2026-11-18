# AI Codebase Archaeologist

Hệ thống hỗ trợ lập trình viên tìm hiểu codebase chưa quen thuộc thông qua phân tích tĩnh, lịch sử Git/GitHub, tìm kiếm ngữ nghĩa và RAG (Retrieval-Augmented Generation) có dẫn chứng bằng chứng thực tế[cite: 1].

---

## 1. Kiến trúc tổng quan & Luồng dữ liệu
- **Giao diện Web:** Next.js / React (Dashboard, Hỏi đáp, Timeline, Đồ thị quan hệ)[cite: 1]
- **Backend API:** FastAPI / Node.js (Xử lý xác thực, phân quyền, điều phối đồng bộ)[cite: 1]
- **Thành phần phân tích:** Tree-sitter parser, Hybrid Search (Vector + Keyword)[cite: 1]
- **Lưu trữ:** Cơ sở dữ liệu quan hệ (Metadata) + Vector Index (pgvector / Qdrant)[cite: 1]

## 2. Yêu cầu hệ thống (Prerequisites)
- Docker & Docker Compose
- Python 3.10+ hoặc Node.js 18+
- Tài khoản GitHub Developer / GitHub App (được cấp quyền đọc repository)[cite: 1]

## 3. Hướng dẫn cài đặt và Khởi chạy (Quick Start)

### Bước 1: Clone repository và thiết lập biến môi trường
```bash
git clone <repository-url>
cd ai-codebase-archaeologist
cp .env.example .env
# Chỉnh sửa các thông số trong file .env (GitHub App credentials, Database URL, LLM API Key)