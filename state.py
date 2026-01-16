import reflex as rx
from typing import List, Dict, Any, Optional
import agent_engine

class Message(rx.Base):
    """
    Represents a message in the chat history.
    """
    role: str  # 'user' or 'assistant'
    content: str
    thought_trace: str = ""
    sql_code: str = ""
    results: List[Dict[str, Any]] = []
    error: str = ""

class State(rx.State):
    """
    The app state.
    """
    chat_history: List[Message] = []
    is_thinking: bool = False

    async def handle_submit(self, form_data: dict):
        """
        Handles the form submission.
        """
        user_question = form_data.get("question")
        if not user_question:
            return

        # 1. Add User Message
        self.chat_history.append(
            Message(role="user", content=user_question)
        )
        self.is_thinking = True
        yield

        # 2. Call Agent Engine
        # Since agent_engine is synchronous (requests/sqlite), we can run it directly 
        # or wrap in run_in_executor if blocking becomes an issue. 
        # For this scale, sync call is fine.
        response_data = agent_engine.process_question(user_question)

        # 3. Construct Assistant Message
        complexity = response_data.get("model_used", "unknown")
        status = response_data.get("status", "error")
        steps = response_data.get("steps", [])
        final_data = response_data.get("final_data", [])
        
        # Aggregate thought/sql/error from steps
        # For simplicity, we take the last relevant step's info or combine them
        last_step = steps[-1] if steps else {}
        
        thought_trace = last_step.get("thought", "")
        # If there was a retry, maybe prepend the first attempt's error?
        if len(steps) > 1:
            first_err = steps[0].get("error", "Unknown error")
            thought_trace = f"[Attempt 1 Failed: {first_err}] \n\nRetry Thought: {thought_trace}"

        sql_code = last_step.get("sql", "")
        error_msg = last_step.get("error", "")
        if status == "error" and not error_msg:
             error_msg = "An unspecified error occurred."

        self.chat_history.append(
            Message(
                role="assistant",
                content=f"Processed using {complexity} model.", # We can display complexity here or UI
                thought_trace=thought_trace or "",
                sql_code=sql_code or "",
                results=final_data or [],
                error=error_msg or ""
            )
        )
        
        self.is_thinking = False
