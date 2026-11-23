from __future__ import annotations
import argparse
import csv
import json
import time
import urllib.request
from pathlib import Path


def post_json(url: str, payload: dict):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--api", default="http://localhost:8000")
    p.add_argument("--repo-id", required=True)
    p.add_argument("--questions", default=str(Path(__file__).with_name("questions.csv")))
    p.add_argument("--out", default=str(Path(__file__).with_name("runs") / "latest.json"))
    args = p.parse_args()
    rows = list(csv.DictReader(open(args.questions, encoding="utf-8")))
    results = []
    for row in rows:
        q = row["question"].strip()
        if not q:
            continue
        t0 = time.perf_counter()
        answer = post_json(f"{args.api}/api/repos/{args.repo_id}/questions", {"question":q, "top_k":5})
        latency = time.perf_counter() - t0
        returned = {e["path"] for e in answer.get("evidence", [])}
        gold = {x.strip() for x in row.get("gold_paths", "").split("|") if x.strip()}
        recall = None if not gold else len(returned & gold) / len(gold)
        results.append({
            "question": q,
            "category": row.get("category"),
            "grounded": answer.get("grounded"),
            "evidence_paths": sorted(returned),
            "gold_paths": sorted(gold),
            "evidence_recall_at_5": recall,
            "latency_seconds": round(latency, 4),
        })
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    measured = [x["evidence_recall_at_5"] for x in results if x["evidence_recall_at_5"] is not None]
    print(json.dumps({
        "questions": len(results),
        "mean_evidence_recall_at_5": (sum(measured)/len(measured)) if measured else None,
        "output": str(out),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
