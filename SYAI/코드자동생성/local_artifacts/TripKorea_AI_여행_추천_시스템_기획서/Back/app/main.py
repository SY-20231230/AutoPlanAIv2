from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

app = FastAPI(
    title="TripKorea AI",
    description="AI-powered personalized travel planner for Korea using Gemini API.",
    version="1.0.0",
)

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    pass

@app.on_event("shutdown")
async def shutdown_event():
    pass

app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["Health Check"])
async def read_root():
    return {"message": "Welcome to the TripKorea AI API!"}