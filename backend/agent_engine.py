import json
import re
import asyncio
import hashlib
import time
from router import determine_complexity
from database_utils import DBManager
from prompts import build_system_prompt
from llm_client import call_llm, call_llm_raw, call_llm_raw_async


# ============ QUERY CACHE ============

class QueryCache:
    """
    Simple in-memory cache for query results with TTL (Time-To-Live).
    Provides instant responses for repeated identical questions.
    """
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        """
        Initialize cache.
        
        Args:
            max_size: Maximum number of cached entries (LRU eviction)
            ttl_seconds: Time-to-live in seconds (default: 1 hour)
        """
        self._cache = {}  # key -> (result, timestamp)
        self._max_size = max_size
        self._ttl = ttl_seconds
    
    def _generate_key(self, question: str, previous_sql: str = None) -> str:
        """Generate cache key from question and context."""
        # Normalize question (lowercase, strip whitespace)
        normalized = question.lower().strip()
        context = previous_sql[:100] if previous_sql else ""
        key_string = f"{normalized}|{context}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, question: str, previous_sql: str = None) -> dict | None:
        """
        Get cached result if exists and not expired.
        
        Returns:
            dict: Cached response or None if miss/expired
        """
        key = self._generate_key(question, previous_sql)
        
        if key in self._cache:
            result, timestamp = self._cache[key]
            age = time.time() - timestamp
            
            if age < self._ttl:
                print(f"[CACHE HIT] Found cached result (age: {age:.1f}s)")
                # Add cache indicator to result
                cached_result = result.copy()
                cached_result["cached"] = True
                cached_result["cache_age"] = round(age, 1)
                return cached_result
            else:
                print(f"[CACHE EXPIRED] Entry too old ({age:.1f}s > {self._ttl}s)")
                del self._cache[key]
        
        return None
    
    def set(self, question: str, result: dict, previous_sql: str = None):
        """
        Cache a result.
        Evicts oldest entries if cache is full.
        """
        key = self._generate_key(question, previous_sql)
        
        # Evict oldest if full
        if len(self._cache) >= self._max_size:
            oldest_key = min(self._cache, key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
            print(f"[CACHE EVICT] Removed oldest entry")
        
        self._cache[key] = (result, time.time())
        print(f"[CACHE SET] Stored result (cache size: {len(self._cache)})")
    
    def clear(self):
        """Clear all cached entries."""
        self._cache.clear()
        print("[CACHE CLEAR] All entries removed")
    
    def stats(self) -> dict:
        """Get cache statistics."""
        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "ttl_seconds": self._ttl
        }


# Global cache instance (persists across requests)
query_cache = QueryCache(max_size=100, ttl_seconds=3600)


def _retry_with_pro(db: DBManager, user_question: str, full_prompt: str, 
                     previous_error: str = None, previous_sql: str = None,
                     attempt_number: int = 2, max_retries: int = 3) -> tuple:
    """
    Retry with PRO (Sonnet) model. Supports multiple retry attempts.
    
    Args:
        attempt_number: Current attempt number (2 = first retry, 3 = second retry, etc.)
        max_retries: Maximum number of retry attempts (default 3)
    
    Returns:
        (step_info, final_data, should_continue_retrying)
    """
    print(f"[RETRY {attempt_number}] Using PRO (Sonnet) model...")
    
    if previous_error and previous_sql:
        retry_prompt = f"""
        Attempt {attempt_number - 1} failed with error: {previous_error}
        The query was: {previous_sql}
        
        Please carefully analyze the error and correct the SQL query to answer: "{user_question}"
        
        IMPORTANT: Make sure to:
        - Check table and column names match the schema exactly
        - Use proper SQL syntax for SQLite
        - Avoid using functions that don't exist in SQLite
        
        Return your response in this STRICT JSON format:
        {{
           "thought_process": "Step-by-step reasoning for the fix...",
           "sql_query": "Corrected SQL..."
        }}
        """
    else:
        retry_prompt = full_prompt
    
    step_info = {"attempt": attempt_number, "thought": None, "sql": None, "error": None}
    
    try:
        raw_response = call_llm(retry_prompt, model_type='pro')
        parsed_response = json.loads(raw_response)
        
        step_info["thought"] = parsed_response.get("thought_process")
        step_info["sql"] = parsed_response.get("sql_query")
        
        if step_info["sql"]:
            df, error = db.execute_query(step_info["sql"])
            if error:
                step_info["error"] = error
                should_retry = attempt_number < (max_retries + 1)  # +1 because attempt starts at 2
                return step_info, None, should_retry
            else:
                return step_info, df.to_dict(orient='records'), False
        else:
            step_info["error"] = "No SQL generated by PRO model"
            should_retry = attempt_number < (max_retries + 1)
            return step_info, None, should_retry
            
    except json.JSONDecodeError:
        step_info["error"] = "Failed to parse PRO model response as JSON"
        should_retry = attempt_number < (max_retries + 1)
        return step_info, None, should_retry
    except Exception as e:
        step_info["error"] = f"PRO model error: {str(e)}"
        should_retry = attempt_number < (max_retries + 1)
        return step_info, None, should_retry


def _fallback_to_pro(db: DBManager, user_question: str, full_prompt: str, 
                     previous_error: str = None, previous_sql: str = None) -> tuple:
    """
    Fallback to PRO (Sonnet) model with up to 3 retry attempts.
    """
    MAX_RETRIES = 3
    current_error = previous_error
    current_sql = previous_sql
    all_steps = []
    
    for attempt in range(2, MAX_RETRIES + 2):  # attempts 2, 3, 4
        step_info, final_data, should_retry = _retry_with_pro(
            db=db,
            user_question=user_question,
            full_prompt=full_prompt,
            previous_error=current_error,
            previous_sql=current_sql,
            attempt_number=attempt,
            max_retries=MAX_RETRIES
        )
        
        all_steps.append(step_info)
        
        if final_data:
            # Success!
            return step_info, final_data
        
        if not should_retry:
            # No more retries allowed
            break
        
        # Update for next retry
        current_error = step_info.get("error", "Unknown error")
        current_sql = step_info.get("sql", current_sql)
        print(f"[RETRY {attempt}] Failed: {current_error[:50]}... Retrying...")
    
    # Return the last step info
    return all_steps[-1] if all_steps else step_info, None


# ============ ASYNC HELPER FUNCTIONS FOR PARALLEL EXECUTION ============

async def _is_follow_up_query_async(current_question: str, previous_sql: str) -> bool:
    """
    Async: Detect if current question is a follow-up to the previous query.
    """
    if not previous_sql:
        return False
    
    prompt = f"""Previous SQL: {previous_sql[:200]}
Question: {current_question}

Is this a follow-up/refinement of the previous query? Answer ONLY "yes" or "no"."""

    try:
        response = await call_llm_raw_async(prompt, model_type='flash')
        is_followup = 'yes' in response.lower().strip()
        print(f"[ASYNC FOLLOW-UP] LLM says: {response.strip()} -> {is_followup}")
        return is_followup
    except Exception as e:
        print(f"[ASYNC FOLLOW-UP] Failed: {e}")
        return False


async def _generate_suggestions_async(user_question: str, sql_code: str, data_sample: list) -> list:
    """
    Async: Generate 3 follow-up question suggestions.
    """
    if not data_sample:
        return []
    
    sample_str = json.dumps(data_sample[:3], indent=2)
    
    prompt = f"""Based on this SQL query and data, suggest exactly 3 short follow-up questions.
    
User's Question: {user_question}
SQL Query: {sql_code}
Sample Data: {sample_str}

Return ONLY a JSON array: ["Q1?", "Q2?", "Q3?"]
Keep questions under 10 words."""

    try:
        raw_response = await call_llm_raw_async(prompt, model_type='flash')
        array_match = re.search(r'\[.*?\]', raw_response, re.DOTALL)
        if array_match:
            suggestions = json.loads(array_match.group(0))
            if isinstance(suggestions, list) and len(suggestions) >= 3:
                return [str(s) for s in suggestions[:3]]
        return []
    except Exception as e:
        print(f"[ASYNC SUGGESTIONS] Failed: {e}")
        return []


async def _generate_data_summary_async(user_question: str, data_sample: list) -> str:
    """
    Async: Generate a 1-sentence business insight.
    """
    if not data_sample:
        return ""
    
    sample_str = json.dumps(data_sample[:5], indent=2)
    
    prompt = f"""User asked: "{user_question}"
Data found (first 5 rows): {sample_str}

Summarize the key insight in exactly 1 sentence. Be specific with numbers.
Return ONLY the summary sentence, no JSON, no quotes."""

    try:
        raw_response = await call_llm_raw_async(prompt, model_type='flash')
        summary = raw_response.strip().strip('"').strip("'")
        summary = re.sub(r'^[`\'"]+|[`\'"]+$', '', summary)
        if summary.startswith('{') or summary.startswith('['):
            return ""
        return summary
    except Exception as e:
        print(f"[ASYNC SUMMARY] Failed: {e}")
        return ""


async def _run_parallel_post_processing(
    user_question: str, 
    sql_code: str, 
    final_data: list, 
    previous_sql: str
) -> tuple:
    """
    Run follow-up check, suggestions, and summary generation in PARALLEL.
    Returns (is_followup, suggestions, data_summary).
    """
    print("[PARALLEL] Starting 3 async LLM calls...")
    
    # Run all 3 LLM calls simultaneously
    is_followup, suggestions, summary = await asyncio.gather(
        _is_follow_up_query_async(user_question, previous_sql),
        _generate_suggestions_async(user_question, sql_code, final_data),
        _generate_data_summary_async(user_question, final_data)
    )
    
    print(f"[PARALLEL] Complete: followup={is_followup}, suggestions={len(suggestions)}, summary_len={len(summary)}")
    
    # Only return summary if it's a follow-up query
    return is_followup, suggestions, summary if is_followup else ""



async def process_question(user_question: str, previous_sql: str = None) -> dict:
    """
    Orchestrates the Text-to-SQL logic with robust fallback.
    Uses CACHING for instant repeated queries.
    Uses PARALLEL LLM calls for post-processing.
    """
    
    # 0. CHECK CACHE FIRST - Instant return if cached
    cached_result = query_cache.get(user_question, previous_sql)
    if cached_result:
        return cached_result
    
    response_structure = {
        "question": user_question,
        "model_used": None,
        "steps": [],
        "final_data": None,
        "suggestions": [],
        "data_summary": "",
        "status": "pending",
        "cached": False
    }

    # 1. Router
    complexity = determine_complexity(user_question)
    response_structure["model_used"] = complexity
    
    # 2. Database Context
    db = DBManager()
    schema_summary = db.get_schema_summary()
    
    # 3. Prompt Construction
    system_prompt = build_system_prompt(schema_summary)
    
    if previous_sql:
        full_prompt = f"""{system_prompt}

### Previous Context
The user's previous query generated this SQL:
```sql
{previous_sql}
```

If the new question is a follow-up, modify the previous SQL. Otherwise, generate a fresh query.

User Question: {user_question}"""
    else:
        full_prompt = f"{system_prompt}\n\nUser Question: {user_question}"
    
    # 4. LLM Call (Attempt 1)
    step_info = {"attempt": 1, "thought": None, "sql": None, "error": None}
    needs_fallback = False
    fallback_error = None
    fallback_sql = None
    
    try:
        print(f"[ATTEMPT 1] Using {complexity.upper()} model...")
        raw_response = call_llm(full_prompt, model_type=complexity)
        parsed_response = json.loads(raw_response)
        
        step_info["thought"] = parsed_response.get("thought_process")
        step_info["sql"] = parsed_response.get("sql_query")
        
        if not step_info["sql"]:
            step_info["error"] = "No SQL generated by LLM"
            needs_fallback = True
            print("[ATTEMPT 1] No SQL generated - triggering fallback")
        else:
            # 5. Execute SQL
            df, error = db.execute_query(step_info["sql"])
            
            if error:
                step_info["error"] = error
                fallback_error = error
                fallback_sql = step_info["sql"]
                needs_fallback = True
                print(f"[ATTEMPT 1] SQL execution failed: {error} - triggering fallback")
            else:
                # Success on Attempt 1!
                final_data = df.to_dict(orient='records')
                response_structure["final_data"] = final_data
                response_structure["status"] = "success"
                response_structure["steps"].append(step_info)
                
                # Run post-processing in PARALLEL
                print("[SUCCESS] Running parallel post-processing...")
                # FIX: await directly instead of asyncio.run()
                is_followup, suggestions, summary = await _run_parallel_post_processing(
                    user_question, step_info["sql"], final_data, previous_sql
                )
                
                response_structure["suggestions"] = suggestions
                response_structure["data_summary"] = summary
                
                # Cache the successful result
                query_cache.set(user_question, response_structure, previous_sql)
                
                return response_structure
                
    except json.JSONDecodeError as e:
        step_info["error"] = f"Failed to parse LLM response as JSON: {str(e)}"
        needs_fallback = True
        print("[ATTEMPT 1] JSON parse error - triggering fallback")
    except Exception as e:
        step_info["error"] = f"Unexpected error: {str(e)}"
        needs_fallback = True
        print(f"[ATTEMPT 1] Exception: {e} - triggering fallback")
    
    response_structure["steps"].append(step_info)
    
    # 6. FALLBACK to PRO (Sonnet)
    if needs_fallback:
        response_structure["model_used"] = "pro (fallback)"
        
        retry_step, final_data = _fallback_to_pro(
            db=db,
            user_question=user_question,
            full_prompt=full_prompt,
            previous_error=fallback_error,
            previous_sql=fallback_sql
        )
        
        response_structure["steps"].append(retry_step)
        
        if final_data:
            response_structure["final_data"] = final_data
            response_structure["status"] = "success"
            
            # Run post-processing in PARALLEL on fallback success
            print("[FALLBACK SUCCESS] Running parallel post-processing...")
            # FIX: await directly instead of asyncio.run()
            is_followup, suggestions, summary = await _run_parallel_post_processing(
                user_question, retry_step["sql"], final_data, previous_sql
            )
            
            response_structure["suggestions"] = suggestions
            response_structure["data_summary"] = summary
            
            # Cache the successful fallback result
            query_cache.set(user_question, response_structure, previous_sql)
        else:
            response_structure["status"] = "error"
    
    return response_structure


# ============ STREAMING VERSION FOR SSE ============

async def process_question_streaming(user_question: str, previous_sql: str = None, llm_mode: str = "paid"):
    """
    Streaming version of process_question that yields SSE events progressively.
    Each yield is a dict with 'event' and 'data' keys.
    
    Args:
        user_question: The user's natural language question
        previous_sql: Optional previous SQL for context
        llm_mode: 'paid' for Claude (Anthropic) or 'free' for Groq (Llama)
    """
    import json as json_module
    from llm_client import set_llm_mode
    
    # Set the LLM mode globally
    set_llm_mode(llm_mode)
    
    # 0. Initial status
    mode_label = "Premium (Claude)" if llm_mode == "paid" else "Free (Llama)"
    yield {"event": "status", "data": f"Analyzing with {mode_label}..."}
    
    # 1. Check cache first
    cached_result = query_cache.get(user_question, previous_sql)
    if cached_result:
        yield {"event": "status", "data": "Found cached result!"}
        yield {"event": "model", "data": cached_result.get("model_used", "cached")}
        
        # Extract from cached
        steps = cached_result.get("steps", [])
        last_step = steps[-1] if steps else {}
        
        if last_step.get("thought"):
            yield {"event": "thought", "data": last_step["thought"]}
        if last_step.get("sql"):
            yield {"event": "sql", "data": last_step["sql"]}
        
        final_data = cached_result.get("final_data", [])
        if final_data:
            columns = list(final_data[0].keys()) if final_data else []
            rows = [[str(row.get(col, "")) for col in columns] for row in final_data]
            yield {"event": "table", "data": {"columns": columns, "results": rows}}
        
        if cached_result.get("suggestions"):
            yield {"event": "suggestions", "data": cached_result["suggestions"]}
        if cached_result.get("data_summary"):
            yield {"event": "summary", "data": cached_result["data_summary"]}
        
        yield {"event": "done", "data": {"status": "success", "cached": True}}
        return
    
    # 2. Router - determine complexity
    yield {"event": "status", "data": "Determining query complexity..."}
    complexity = determine_complexity(user_question)
    yield {"event": "model", "data": complexity}
    
    # 3. Database context
    yield {"event": "status", "data": "Loading database schema..."}
    db = DBManager()
    schema_summary = db.get_schema_summary()
    
    # 4. Build prompt
    yield {"event": "status", "data": "Building prompt..."}
    system_prompt = build_system_prompt(schema_summary)
    
    if previous_sql:
        full_prompt = f"""{system_prompt}

### Previous Context
The user's previous query generated this SQL:
```sql
{previous_sql}
```

If the new question is a follow-up, modify the previous SQL. Otherwise, generate a fresh query.

User Question: {user_question}"""
    else:
        full_prompt = f"{system_prompt}\n\nUser Question: {user_question}"
    
    # 5. LLM Call
    yield {"event": "status", "data": f"Calling {complexity.upper()} model..."}
    
    step_info = {"attempt": 1, "thought": None, "sql": None, "error": None}
    needs_fallback = False
    fallback_error = None
    fallback_sql = None
    final_data = None
    
    try:
        raw_response = call_llm(full_prompt, model_type=complexity)
        parsed_response = json_module.loads(raw_response)
        
        step_info["thought"] = parsed_response.get("thought_process")
        step_info["sql"] = parsed_response.get("sql_query")
        
        # Stream thought process
        if step_info["thought"]:
            yield {"event": "thought", "data": step_info["thought"]}
        
        if not step_info["sql"]:
            step_info["error"] = "No SQL generated by LLM"
            needs_fallback = True
            yield {"event": "status", "data": "No SQL generated, trying fallback..."}
        else:
            # Stream SQL
            yield {"event": "sql", "data": step_info["sql"]}
            yield {"event": "status", "data": "Executing SQL query..."}
            
            # Execute SQL
            df, error = db.execute_query(step_info["sql"])
            
            if error:
                step_info["error"] = error
                fallback_error = error
                fallback_sql = step_info["sql"]
                needs_fallback = True
                yield {"event": "status", "data": f"SQL error: {error[:50]}... Trying fallback..."}
            else:
                # Success! Stream table immediately
                final_data = df.to_dict(orient='records')
                columns = list(final_data[0].keys()) if final_data else []
                rows = [[str(row.get(col, "")) for col in columns] for row in final_data]
                
                yield {"event": "table", "data": {"columns": columns, "results": rows}}
                yield {"event": "status", "data": "Generating insights..."}
                
    except json_module.JSONDecodeError as e:
        step_info["error"] = f"JSON parse error: {str(e)}"
        needs_fallback = True
        yield {"event": "status", "data": "Parse error, trying fallback..."}
    except Exception as e:
        step_info["error"] = f"Error: {str(e)}"
        needs_fallback = True
        yield {"event": "status", "data": f"Error occurred, trying fallback..."}
    
    # 6. Fallback with up to 3 retries if needed
    if needs_fallback:
        MAX_RETRIES = 3
        current_error = fallback_error
        current_sql = fallback_sql
        
        for attempt in range(2, MAX_RETRIES + 2):  # attempts 2, 3, 4
            yield {"event": "model", "data": f"pro (retry {attempt - 1}/{MAX_RETRIES})"}
            yield {"event": "status", "data": f"Retry {attempt - 1}/{MAX_RETRIES}: Calling PRO model..."}
            
            retry_step, retry_data, should_continue = _retry_with_pro(
                db=db,
                user_question=user_question,
                full_prompt=full_prompt,
                previous_error=current_error,
                previous_sql=current_sql,
                attempt_number=attempt,
                max_retries=MAX_RETRIES
            )
            
            if retry_step.get("thought"):
                yield {"event": "thought", "data": retry_step["thought"]}
            if retry_step.get("sql"):
                yield {"event": "sql", "data": retry_step["sql"]}
            
            if retry_data:
                # Success!
                final_data = retry_data
                columns = list(final_data[0].keys()) if final_data else []
                rows = [[str(row.get(col, "")) for col in columns] for row in final_data]
                yield {"event": "table", "data": {"columns": columns, "results": rows}}
                yield {"event": "status", "data": "Generating insights..."}
                step_info = retry_step  # Update step_info for post-processing
                break
            
            if not should_continue:
                yield {"event": "error", "data": retry_step.get("error", "Query failed after all retries")}
                yield {"event": "done", "data": {"status": "error"}}
                return
            
            # Update for next retry
            current_error = retry_step.get("error", "Unknown error")
            current_sql = retry_step.get("sql", current_sql)
            yield {"event": "status", "data": f"Retry {attempt - 1} failed: {current_error[:40]}..."}
        else:
            # All retries exhausted
            yield {"event": "error", "data": f"Query failed after {MAX_RETRIES} retries"}
            yield {"event": "done", "data": {"status": "error"}}
            return
    
    # 7. Post-processing (parallel) - suggestions and summary
    if final_data:
        try:
            is_followup, suggestions, summary = await _run_parallel_post_processing(
                user_question, step_info.get("sql") or "", final_data, previous_sql
            )
            
            # Stream suggestions
            if suggestions:
                yield {"event": "suggestions", "data": suggestions}
            
            # Stream summary (only for follow-ups)
            if summary:
                yield {"event": "summary", "data": summary}
            
            # Cache the result
            response_structure = {
                "question": user_question,
                "model_used": complexity,
                "steps": [step_info],
                "final_data": final_data,
                "suggestions": suggestions,
                "data_summary": summary,
                "status": "success",
                "cached": False
            }
            query_cache.set(user_question, response_structure, previous_sql)
            
        except Exception as e:
            print(f"[STREAMING] Post-processing error: {e}")
    
    yield {"event": "done", "data": {"status": "success"}}


