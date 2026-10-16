from fastapi import FastAPI
from app.modules.recipe_import.router import router as recipe_import_router

app = FastAPI(title="LosCalorías")
app.include_router(recipe_import_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
