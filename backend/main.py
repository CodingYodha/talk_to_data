"""
Talk to Data - FastAPI Backend Server
Text-to-SQL Agent with natural language query processing
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from agent_engine import process_question, process_question_streaming

# Initialize FastAPI app
app = FastAPI(
    title="Talk to Data API",
    description="Text-to-SQL Agent API for querying the Chinook database",
    version="2.0.0"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
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


# ============ API Endpoints ============

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="Talk to Data API is running"
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


# ============ Run Server ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

