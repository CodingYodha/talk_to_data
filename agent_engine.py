import json
from router import determine_complexity
from database_utils import db_manager
from prompts import build_system_prompt
from llm_client import call_llm

def process_question(user_question):
    """
    Orchestrates the Text-to-SQL logic:
    1. Determine complexity (Router).
    2. Get schema context (DB).
    3. Build System Prompt (Props).
    4. Call LLM.
    5. Parse and return result.
    
    Args:
        user_question (str): The user's natural language question.
        
    Returns:
        dict: Contains 'complexity', 'thought_process', and 'sql_query'.
    """
    # 1. Router
    complexity = determine_complexity(user_question)
    
    # 2. Database Context
    db = db_manager()
    schema_summary = db.get_schema_summary()
    
    # 3. Prompt Construction
    system_prompt = build_system_prompt(schema_summary)
    full_prompt = f"{system_prompt}\n\nUser Question: {user_question}"
    
    # 4. LLM Call
    try:
        raw_response = call_llm(full_prompt, model_type=complexity)
        
        # 5. Parsing
        parsed_response = json.loads(raw_response)
        
        return {
            "complexity": complexity,
            "thought_process": parsed_response.get("thought_process", "No thought provided"),
            "sql_query": parsed_response.get("sql_query", "")
        }
        
    except json.JSONDecodeError:
        return {
            "complexity": complexity,
            "error": "Failed to parse LLM response as JSON",
            "raw_response": raw_response
        }
    except Exception as e:
        return {
            "complexity": complexity,
            "error": f"An error occurred: {str(e)}"
        }
