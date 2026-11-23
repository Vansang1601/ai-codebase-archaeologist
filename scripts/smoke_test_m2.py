import json
import time
import urllib.request
from uuid import uuid4

def post(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='POST')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def main():
    tag = uuid4().hex[:6]
    # 1. Register test user
    user = post('http://localhost:8000/api/auth/register', {'email': f'smoke_{tag}@example.com'})
    token = user['access_token']
    print(f"User registered: {user['user_id']} (Tenant: {user['tenant_id']})")

    # 2. Register repository
    repo = post('http://localhost:8000/api/repos', {'url': 'https://github.com/pallets/click'}, token)
    repo_id = repo['id']
    print(f"Repo registered: {repo_id} ({repo['owner']}/{repo['name']})")

    # 3. Start sync job
    job = post(f'http://localhost:8000/api/repos/{repo_id}/sync', {'ref': None}, token)
    job_id = job['id']
    print(f"Job started: {job_id} status={job['status']}")

    # 4. Wait for worker pipeline
    for i in range(40):
        j = get(f'http://localhost:8000/api/jobs/{job_id}', token)
        print(f"Poll {i+1}: phase={j['phase']} progress={j['progress']}% status={j['status']}")
        if j['status'] in ('completed', 'failed'):
            break
        time.sleep(2)

    print("\n=== Final Job Summary ===")
    print(f"Status: {j['status']}")
    print(f"Phase: {j['phase']}")
    print(f"Progress: {j['progress']}%")
    print(f"Skipped files: {j.get('skipped_files')}")
    print(f"PR status: {j.get('pr_status')}")
    print(f"PR count: {j.get('pr_count')}")

    # 5. Check Pull Requests
    prs = get(f'http://localhost:8000/api/repos/{repo_id}/pulls', token)
    print(f"\nIngested PRs count from DB: {len(prs)}")
    for p in prs[:3]:
        print(f" - PR #{p['number']}: {p['title']} [{p['state']}] by @{p['author_name']}")

    # 6. Check Files
    files = get(f'http://localhost:8000/api/repos/{repo_id}/files?limit=5', token)
    print(f"\nFiles count sample: {len(files)}")
    for f in files[:3]:
        print(f" - {f['path']} ({f['line_count']} lines, {f['language']})")

    # 7. Check Commits
    commits = get(f'http://localhost:8000/api/repos/{repo_id}/timeline?limit=5', token)
    print(f"\nCommits count sample: {len(commits)}")
    for c in commits[:3]:
        print(f" - {c['short_sha']}: {c['message']} by {c['author_name']}")

if __name__ == '__main__':
    main()
