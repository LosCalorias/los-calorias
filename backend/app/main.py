from fastapi import FastAPI

app = FastAPI(title="LosCalorías")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
