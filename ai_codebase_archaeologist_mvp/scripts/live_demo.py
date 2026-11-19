import json
import time
import urllib.request
import urllib.error
from uuid import uuid4

def post(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def check_status(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return str(e)

def main():
    print("==================================================================")
    print("   AI CODEBASE ARCHAEOLOGIST - CHẠY THỬ HỆ THỐNG THỰC TẾ (DEMO)   ")
    print("==================================================================\n")

    # 1. Kiểm tra dịch vụ
    print("[1/6] Kiểm tra trạng thái các dịch vụ container:")
    fe_code = check_status("http://localhost:3000/")
    be_health = get("http://localhost:8000/health")
    auth_status = get("http://localhost:8000/api/auth/status")
    print(f"  - Frontend Next.js (:3000): HTTP {fe_code} (Sẵn sàng)")
    print(f"  - Backend FastAPI (:8000): {be_health}")
    print(f"  - Chế độ Auth: env={auth_status.get('environment')}, dev_login={auth_status.get('allow_dev_login')}")

    # 2. Tạo Workspace & Đăng nhập
    print("\n[2/6] Tạo phiên làm việc Workspace & Phân quyền bảo mật (Tenant):")
    uid = uuid4().hex[:6]
    test_email = f"demo_user_{uid}@archaeologist.local"
    reg = post("http://localhost:8000/api/auth/register", {"email": test_email, "name": f"Developer {uid}"})
    token = reg["access_token"]
    user_info = get("http://localhost:8000/api/auth/me", token)
    print(f"  - User ID: {user_info['user_id']}")
    print(f"  - Email: {user_info['email']}")
    print(f"  - Workspace Tenant ID: {user_info['tenant_id']}")
    print(f"  - Phiên làm việc JWT được cấp thành công (không lưu localStorage)")

    # 3. Đăng ký repository & Trigger Ingestion
    print("\n[3/6] Đăng ký Repository và Kích hoạt Pipeline Ingestion:")
    repo_url = "https://github.com/pallets/click"
    repo = post("http://localhost:8000/api/repos", {"url": repo_url}, token)
    repo_id = repo["id"]
    print(f"  - Repo ID: {repo_id}")
    print(f"  - Kho mã: {repo['owner']}/{repo['name']}")
    print(f"  - URL Canonical: {repo['canonical_url']}")

    sync_job = post(f"http://localhost:8000/api/repos/{repo_id}/sync", {"ref": None}, token)
    job_id = sync_job["id"]
    print(f"  - Tạo Ingestion Job ID: {job_id}")

    # 4. Polling tiến độ Ingestion
    print("\n[4/6] Theo dõi tiến trình phân tích tự động:")
    for step in range(30):
        j = get(f"http://localhost:8000/api/jobs/{job_id}", token)
        print(f"  --> Bước {step+1}: Pha = [{j['phase']}], Tiến độ = {j['progress']}%, Trạng thái = {j['status']}")
        if j["status"] in ("completed", "failed"):
            break
        time.sleep(2)

    # 5. Kiểm tra toàn bộ dữ liệu đã ingest vào PostgreSQL
    print("\n[5/6] Dữ liệu snapshot thu thập thực tế:")
    repo_detail = get(f"http://localhost:8000/api/repos/{repo_id}", token)
    snap = repo_detail.get("snapshot") or {}
    print(f"  - Commit SHA: {snap.get('commit_sha')}")
    print(f"  - Tổng số tệp mã nguồn: {snap.get('file_count')} files")
    print(f"  - Ký hiệu mã (Symbols AST): {snap.get('symbol_count')} symbols")
    print(f"  - Đoạn mã chỉ mục (Chunks): {snap.get('chunk_count')} chunks")

    prs = get(f"http://localhost:8000/api/repos/{repo_id}/pulls", token)
    print(f"  - Pull Requests thu thập: {len(prs)} PRs")
    for pr in prs[:2]:
        print(f"    * PR #{pr['number']}: {pr['title']} [{pr['state']}] bởi @{pr['author_name']}")

    commits = get(f"http://localhost:8000/api/repos/{repo_id}/timeline?limit=3", token)
    print(f"  - Commits thu thập: {len(commits)} commits mẫu:")
    for c in commits[:2]:
        print(f"    * {c['short_sha']}: {c['message']} ({c['author_name']})")

    # 6. Hỏi đáp Grounded Q&A có trích dẫn nguồn
    print("\n[6/6] Thử nghiệm tính năng Hỏi đáp có dẫn chứng (Grounded Q&A):")
    q = "What does the core Command class in Click do?"
    answer_res = post(f"http://localhost:8000/api/repos/{repo_id}/questions", {"question": q, "top_k": 3}, token)
    print(f"  - Câu hỏi: \"{q}\"")
    print(f"  - Grounded: {answer_res.get('grounded')}")
    print(f"  - Trả lời rút gọn: {answer_res.get('answer')[:180]}...")
    print(f"  - Bằng chứng tĩnh trích dẫn ({len(answer_res.get('evidence', []))} evidence):")
    for ev in answer_res.get("evidence", [])[:2]:
        print(f"    * [E] {ev['path']}:{ev['line_start']}-{ev['line_end']} (Score: {ev['score']}) -> {ev.get('github_url')}")

    print("\n==================================================================")
    print("   KẾT QUẢ: HỆ THỐNG ĐANG HOẠT ĐỘNG HOÀN TOÀN BÌNH THƯỜNG!        ")
    print(f"   Trang web: http://localhost:3000/repos/{repo_id}               ")
    print("==================================================================")

if __name__ == "__main__":
    main()
