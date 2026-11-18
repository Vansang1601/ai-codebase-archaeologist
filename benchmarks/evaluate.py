"""Đo Evidence Recall@k, citation correctness, impact precision/recall. Khung ban đầu."""
import json
from pathlib import Path

HERE = Path(__file__).parent


def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main():
    qa = load("qa_dataset.json")
    impact = load("impact_dataset.json")
    print(f"QA: {len(qa)} câu | Impact: {len(impact)} ca")
    # TODO: chạy hệ thống, tính metric


if __name__ == "__main__":
    main()
