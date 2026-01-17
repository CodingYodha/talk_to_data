"""
Talk to Data - FastAPI Backend Server
Text-to-SQL Agent with natural language query processing
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import json
import os

# Initialize settings FIRST - fail fast if config is invalid
from config import init_settings, get_settings
settings = init_settings()

from agent_engine import process_question, process_question_streaming
from analysis_engine import analyze_data

# Initialize FastAPI app
app = FastAPI(
    title="Talk to Data API",
    description="Text-to-SQL Agent API for querying the Chinook database",
    version="2.0.0"
)

# Configure CORS from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Pydantic Models ============

class QueryRequest(BaseModel):
    """Request model for query endpoint"""
    question: str
    previous_sql: Optional[str] = None  # For conversation context
    llm_mode: Optional[str] = "paid"  # 'paid' for Claude, 'free' for GPT-OSS


class QueryResponse(BaseModel):
    """Response model for query endpoint"""
    status: str  # 'success' or 'error'
    model_used: Optional[str] = None
    thought_trace: str = ""
    sql_code: str = ""
    columns: List[str] = []
    results: List[List[str]] = []  # List of rows, each row is list of string values
    suggestions: List[str] = []  # 3 follow-up question suggestions
    data_summary: str = ""  # 1-sentence business insight
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    message: str


class AnalyzeRequest(BaseModel):
    """Request model for analysis endpoint"""
    data: List[dict]  # Query result data
    question: str = ""  # Original user question for context


class ChartConfig(BaseModel):
    """Chart configuration model"""
    type: str  # bar, line, scatter, pie, histogram, area
    x_key: str
    y_key: str
    data: List[dict]


class AnalyzeResponse(BaseModel):
    """Response model for analysis endpoint"""
    success: bool
    chart_config: Optional[ChartConfig] = None
    insight_summary: str = ""
    error: Optional[str] = None


# ============ API Endpoints ============

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint - verifies database connectivity.
    Returns 200 if healthy, 503 if database unreachable.
    """
    from database_utils import DatabaseManager
    
    try:
        # Actually ping the database
        if DatabaseManager.health_check():
            db_type = DatabaseManager.get_database_type()
            return HealthResponse(
                status="healthy",
                message=f"Talk to Data API is running. Database ({db_type}) connected."
            )
        else:
            raise HTTPException(
                status_code=503,
                detail="Database connection failed"
            )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {str(e)}"
        )


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_data_endpoint(request: AnalyzeRequest):
    """
    Analyze query results and return chart configuration.
    Uses heuristic analysis with LLM fallback.
    """
    if not request.data or len(request.data) == 0:
        return AnalyzeResponse(
            success=False,
            error="No data provided for analysis"
        )
    
    try:
        result = analyze_data(request.data, request.question)
        
        if result.get("success"):
            return AnalyzeResponse(
                success=True,
                chart_config=ChartConfig(**result["chart_config"]),
                insight_summary=result.get("insight_summary", "")
            )
        else:
            return AnalyzeResponse(
                success=False,
                error=result.get("error", "Analysis failed"),
                insight_summary=result.get("insight_summary", "")
            )
    except Exception as e:
        print(f"[ERROR] Analysis failed: {e}")
        return AnalyzeResponse(
            success=False,
            error=str(e)
        )


@app.post("/api/query", response_model=QueryResponse)
async def submit_query(request: QueryRequest):
    """
    Process a natural language query and return SQL results.
    
    Args:
        request: QueryRequest containing the user's question and optional previous_sql
        
    Returns:
        QueryResponse with results, SQL, reasoning trace, suggestions, and data summary.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        # Process the question through the agent engine
        result = await process_question(
            user_question=request.question.strip(),
            previous_sql=request.previous_sql
        )
        
        # Extract data from the result
        status = result.get("status", "error")
        model_used = result.get("model_used")
        steps = result.get("steps", [])
        final_data = result.get("final_data", [])
        suggestions = result.get("suggestions", [])
        data_summary = result.get("data_summary", "")
        
        # Get the last step for thought trace and SQL
        last_step = steps[-1] if steps else {}
        thought_trace = last_step.get("thought", "") or ""
        sql_code = last_step.get("sql", "") or ""
        error_msg = last_step.get("error", "") or ""
        
        # If there was a retry, include first attempt's error in the trace
        if len(steps) > 1:
            first_err = steps[0].get("error", "Unknown error")
            thought_trace = f"[Attempt 1 Failed: {first_err}]\n\nRetry Thought: {thought_trace}"
        
        # Convert data to list of lists format with columns
        columns = []
        table_rows = []
        if final_data and len(final_data) > 0:
            columns = list(final_data[0].keys())
            for row_dict in final_data:
                row_values = [str(row_dict.get(col, "")) for col in columns]
                table_rows.append(row_values)
        
        return QueryResponse(
            status=status,
            model_used=model_used,
            thought_trace=thought_trace,
            sql_code=sql_code,
            columns=columns,
            results=table_rows,
            suggestions=suggestions,
            data_summary=data_summary,
            error=error_msg if status == "error" else None
        )
        
    except Exception as e:
        print(f"[ERROR] Query processing failed: {e}")
        return QueryResponse(
            status="error",
            error=str(e)
        )


# ============ SSE Streaming Endpoint ============

@app.post("/api/query/stream")
async def stream_query(request: QueryRequest):
    """
    SSE streaming endpoint for progressive query results.
    Sends events as they complete: status, model, thought, sql, table, suggestions, summary, done.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    async def event_generator():
        try:
            async for event in process_question_streaming(
                user_question=request.question.strip(),
                previous_sql=request.previous_sql,
                llm_mode=request.llm_mode
            ):
                event_type = event.get("event", "message")
                event_data = event.get("data", "")
                
                # Format as SSE
                if isinstance(event_data, (dict, list)):
                    data_str = json.dumps(event_data)
                else:
                    data_str = str(event_data)
                
                # SSE requires newlines in data to be sent as separate data: lines
                # Or we can encode newlines to prevent corruption
                data_str = data_str.replace('\n', '\\n').replace('\r', '\\r')
                
                yield f"event: {event_type}\ndata: {data_str}\n\n"
                
        except Exception as e:
            print(f"[SSE ERROR] Stream error: {e}")
            yield f"event: error\ndata: {str(e)}\n\n"
            yield f"event: done\ndata: {{\"status\": \"error\"}}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ============ STATIC FILE SERVING (Monolith Deployment) ============

# Path to frontend build directory
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

# Only mount static files if build directory exists
if os.path.exists(FRONTEND_BUILD_DIR):
    print(f"[STATIC] Serving frontend from: {FRONTEND_BUILD_DIR}")
    
    # Mount static assets (js, css, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD_DIR, "assets")), name="static-assets")
    
    # Catch-all route for SPA - must be AFTER all API routes
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """
        Serve frontend for all non-API routes.
        Enables client-side routing (React Router, etc.)
        """
        # If it's an API call that wasn't caught, return 404
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Try to serve the specific file first
        file_path = os.path.join(FRONTEND_BUILD_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise serve index.html for SPA routing
        index_path = os.path.join(FRONTEND_BUILD_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="Frontend not found")
else:
    print(f"[STATIC] Frontend build not found at: {FRONTEND_BUILD_DIR}")
    print(f"[STATIC] Run 'npm run build' in frontend directory to enable static serving")


# ============ Run Server ============

if __name__ == "__main__":
    import uvicorn
    # Use PORT env var for cloud platforms (Railway, Render, etc.)
    port = int(os.environ.get("PORT", 8000))
    print(f"[SERVER] Starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
