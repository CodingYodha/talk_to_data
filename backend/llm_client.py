import re
import json
from anthropic import Anthropic, AsyncAnthropic
import httpx

# Import centralized config
from config import get_settings

# Get settings (already validated at startup)
_settings = get_settings()

# Initialize Anthropic clients with validated API key
anthropic_client = Anthropic(api_key=_settings.ANTHROPIC_API_KEY)
async_anthropic_client = AsyncAnthropic(api_key=_settings.ANTHROPIC_API_KEY)

# Groq API config
GROQ_API_KEY = _settings.GROQ_API_KEY
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Model mappings from config
MODELS = _settings.models

# Current LLM mode - can be 'paid' or 'free'
_current_llm_mode = "paid"

def set_llm_mode(mode: str):
    """Set the LLM mode globally."""
    global _current_llm_mode
    if mode in ["paid", "free"]:
        _current_llm_mode = mode
        print(f"[LLM MODE] Switched to: {mode}")

def get_llm_mode() -> str:
    """Get current LLM mode."""
    return _current_llm_mode


def _clean_json_response(response_text: str) -> str:
    """
    Robustly extracts and cleans JSON from LLM responses.
    Handles various markdown formats, code blocks, and extra text.
    """
    if not response_text:
        return "{}"
    
    text = response_text.strip()
    
    # Pattern 1: Extract content from ```json ... ``` blocks
    json_block_pattern = r'```(?:json)?\s*\n?([\s\S]*?)\n?```'
    matches = re.findall(json_block_pattern, text, re.IGNORECASE)
    if matches:
        text = matches[0].strip()
    else:
        text = re.sub(r'```(?:json)?', '', text, flags=re.IGNORECASE)
        text = text.replace('```', '')
    
    # Pattern 3: Try to find JSON object directly { ... }
    json_object_pattern = r'\{[\s\S]*\}'
    json_match = re.search(json_object_pattern, text)
    if json_match:
        text = json_match.group(0)
    
    text = text.strip()
    text = text.replace('\\"', '"')
    
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]
    
    if not text.startswith('{'):
        print(f"[WARNING] Response doesn't look like JSON: {text[:100]}...")
        return "{}"
    
    return text


# JSON Repair prompt for retry
JSON_REPAIR_PROMPT = """Your last response was not valid JSON. Please provide the exact same answer again, but ONLY in strict JSON format.

Your previous response was:
{previous_response}

Please respond with ONLY a valid JSON object like:
{{
   "thought_process": "Your reasoning here...",
   "sql_query": "SELECT ... FROM ..."
}}

Output ONLY the JSON, no other text."""


def _call_with_json_retry(call_func, prompt: str, model_type: str, max_retries: int = 1):
    """
    Wrapper that retries LLM call if JSON parsing fails.
    
    Args:
        call_func: The actual LLM call function to use
        prompt: Original prompt
        model_type: 'flash' or 'pro'
        max_retries: Number of retry attempts for JSON parsing (default 1)
    
    Returns:
        Parsed JSON dict or raises exception
    """
    # First attempt
    raw_response = call_func(prompt, model_type)
    cleaned = _clean_json_response(raw_response)
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"[JSON RETRY] First parse failed: {e}")
    
    # Retry with repair prompt
    for attempt in range(max_retries):
        print(f"[JSON RETRY] Attempt {attempt + 1}/{max_retries} - Asking model to fix JSON...")
        
        repair_prompt = JSON_REPAIR_PROMPT.format(previous_response=raw_response[:500])
        
        try:
            retry_response = call_func(repair_prompt, model_type)
            cleaned = _clean_json_response(retry_response)
            parsed = json.loads(cleaned)
            print(f"[JSON RETRY] Success on retry {attempt + 1}")
            return parsed
        except json.JSONDecodeError as e:
            print(f"[JSON RETRY] Retry {attempt + 1} failed: {e}")
            raw_response = retry_response  # Use latest for next attempt
    
    # All retries failed - return string for caller to handle
    raise json.JSONDecodeError(
        f"Failed to parse JSON after {max_retries + 1} attempts",
        cleaned, 0
    )


def _call_groq(prompt: str, system_prompt: str = "Output valid JSON only.", max_tokens: int = 4096) -> str:
    """Call Groq API (OpenAI-compatible)."""
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set in environment")
    
    model = MODELS["free"]["flash"]
    
    try:
        response = httpx.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": max_tokens,
                "temperature": 0.1
            },
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        print(f"[DEBUG] Groq ({model}) Response: {content[:300]}...")
        return content
    except Exception as e:
        print(f"[ERROR] Groq API Error: {e}")
        raise Exception(f"Groq API Error: {e}")


async def _call_groq_async(prompt: str, system_prompt: str = "", max_tokens: int = 1024) -> str:
    """Async call to Groq API."""
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set in environment")
    
    model = MODELS["free"]["flash"]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt} if system_prompt else None,
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.1
                },
                timeout=60.0
            )
            response.raise_for_status()
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            print(f"[ASYNC] Groq ({model}) Raw: {content[:100]}...")
            return content.strip()
    except Exception as e:
        print(f"[ERROR] Async Groq Error: {e}")
        raise Exception(f"Async Groq Error: {e}")


def call_llm(prompt: str, model_type: str = 'flash', llm_mode: str = None) -> str:
    """
    Calls the specified LLM provider and returns a JSON string (sync).
    """
    mode = llm_mode or _current_llm_mode
    system_prompt = "Output valid JSON only."
    
    # Use Groq for free mode
    if mode == "free":
        result = _call_groq(prompt, system_prompt)
        return _clean_json_response(result)
    
    # Use Anthropic for paid mode
    if model_type == 'flash':
        try:
            message = anthropic_client.messages.create(
                model=MODELS["paid"]["flash"],
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            result = _clean_json_response(message.content[0].text)
            print(f"[DEBUG] Haiku Response: {result[:300]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Haiku API Error: {e}")
            raise Exception(f"Haiku API Error: {e}")

    elif model_type == 'pro':
        try:
            message = anthropic_client.messages.create(
                model=MODELS["paid"]["pro"],
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            result = _clean_json_response(message.content[0].text)
            print(f"[DEBUG] Sonnet Response: {result[:300]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Sonnet API Error: {e}")
            raise Exception(f"Sonnet API Error: {e}")

    else:
        raise Exception(f"Unknown model_type '{model_type}'")


def call_llm_json(prompt: str, model_type: str = 'flash', llm_mode: str = None) -> dict:
    """
    Calls the LLM and returns a PARSED JSON dict.
    If JSON parsing fails, retries with a repair prompt asking the model to fix the format.
    
    Args:
        prompt: The prompt to send
        model_type: 'flash' or 'pro'
        llm_mode: Override the global mode ('paid' or 'free')
    
    Returns:
        Parsed JSON as dict
        
    Raises:
        json.JSONDecodeError if parsing fails after retry
    """
    mode = llm_mode or _current_llm_mode
    
    def make_raw_call(p: str, mt: str) -> str:
        """Internal raw call function for retry wrapper."""
        system_prompt = "Output valid JSON only."
        
        if mode == "free":
            return _call_groq(p, system_prompt)
        
        if mt == 'flash':
            message = anthropic_client.messages.create(
                model=MODELS["paid"]["flash"],
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": p}]
            )
            return message.content[0].text
        else:  # pro
            message = anthropic_client.messages.create(
                model=MODELS["paid"]["pro"],
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": p}]
            )
            return message.content[0].text
    
    return _call_with_json_retry(make_raw_call, prompt, model_type, max_retries=1)


def call_llm_raw(prompt: str, model_type: str = 'flash', llm_mode: str = None) -> str:
    """
    Calls the LLM and returns RAW response without JSON cleaning (sync).
    """
    mode = llm_mode or _current_llm_mode
    
    # Use Groq for free mode
    if mode == "free":
        return _call_groq(prompt, "", max_tokens=1024)
    
    # Use Anthropic for paid mode
    if model_type == 'flash':
        try:
            message = anthropic_client.messages.create(
                model=MODELS["paid"]["flash"],
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            result = message.content[0].text.strip()
            print(f"[DEBUG] Haiku Raw: {result[:150]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Haiku API Error: {e}")
            raise Exception(f"Haiku API Error: {e}")

    elif model_type == 'pro':
        try:
            message = anthropic_client.messages.create(
                model=MODELS["paid"]["pro"],
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            result = message.content[0].text.strip()
            print(f"[DEBUG] Sonnet Raw: {result[:150]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Sonnet API Error: {e}")
            raise Exception(f"Sonnet API Error: {e}")

    else:
        raise Exception(f"Unknown model_type '{model_type}'")


# ============ ASYNC VERSIONS FOR PARALLEL CALLS ============

async def call_llm_raw_async(prompt: str, model_type: str = 'flash', llm_mode: str = None) -> str:
    """
    Async version - Calls the LLM and returns RAW response.
    Use this for parallel calls with asyncio.gather().
    """
    mode = llm_mode or _current_llm_mode
    
    # Use Groq for free mode
    if mode == "free":
        return await _call_groq_async(prompt, "", max_tokens=1024)
    
    # Use Anthropic for paid mode
    if model_type == 'flash':
        try:
            message = await async_anthropic_client.messages.create(
                model=MODELS["paid"]["flash"],
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            result = message.content[0].text.strip()
            print(f"[ASYNC] Haiku Raw: {result[:100]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Async Haiku Error: {e}")
            raise Exception(f"Async Haiku Error: {e}")

    elif model_type == 'pro':
        try:
            message = await async_anthropic_client.messages.create(
                model=MODELS["paid"]["pro"],
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            result = message.content[0].text.strip()
            print(f"[ASYNC] Sonnet Raw: {result[:100]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Async Sonnet Error: {e}")
            raise Exception(f"Async Sonnet Error: {e}")

    else:
        raise Exception(f"Unknown model_type '{model_type}'")
