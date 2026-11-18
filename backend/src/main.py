from fastapi import FastAPI

app = FastAPI(title="AI Codebase Archaeologist API")


@app.get("/health")
def health():
    return {"status": "ok"}
