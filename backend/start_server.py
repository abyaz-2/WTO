"""Start the FastAPI server for development."""
import os
import uvicorn

os.environ.setdefault("REDIS_URL", "")
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "local-dev")
os.environ.setdefault("SUPABASE_JWT_SECRET", "local-dev-secret")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
