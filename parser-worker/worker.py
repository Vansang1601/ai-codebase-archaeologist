"""Lắng nghe hàng đợi tác vụ (ingest / parse / embed). Khung ban đầu."""
import os
import time


def main():
    print("parser-worker khởi động; REDIS_URL =", os.getenv("REDIS_URL"))
    while True:
        time.sleep(5)  # TODO: nhận job từ queue


if __name__ == "__main__":
    main()
