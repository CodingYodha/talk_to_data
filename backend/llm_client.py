import os
import re
from anthropic import Anthropic, AsyncAnthropic
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Initialize Anthropic clients (sync and async)
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
async_anthropic_client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


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


def call_llm(prompt: str, model_type: str = 'flash') -> str:
    """
    Calls the specified LLM provider and returns a JSON string (sync).
    """
    system_prompt = "Output valid JSON only."
    
    if model_type == 'flash':
        try:
            message = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
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
                model="claude-sonnet-4-5-20250929",
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


def call_llm_raw(prompt: str, model_type: str = 'flash') -> str:
    """
    Calls the LLM and returns RAW response without JSON cleaning (sync).
    """
    if model_type == 'flash':
        try:
            message = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
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
                model="claude-sonnet-4-5-20250929",
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

async def call_llm_raw_async(prompt: str, model_type: str = 'flash') -> str:
    """
    Async version - Calls the LLM and returns RAW response.
    Use this for parallel calls with asyncio.gather().
    """
    if model_type == 'flash':
        try:
            message = await async_anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
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
                model="claude-sonnet-4-5-20250929",
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
