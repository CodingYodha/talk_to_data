import os
import re
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


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
        # Take the first JSON block found
        text = matches[0].strip()
    else:
        # Pattern 2: Remove any remaining backticks
        text = re.sub(r'```(?:json)?', '', text, flags=re.IGNORECASE)
        text = text.replace('```', '')
    
    # Pattern 3: Try to find JSON object directly { ... }
    json_object_pattern = r'\{[\s\S]*\}'
    json_match = re.search(json_object_pattern, text)
    if json_match:
        text = json_match.group(0)
    
    # Pattern 4: Clean up common issues
    # Remove leading/trailing whitespace and newlines
    text = text.strip()
    
    # Pattern 5: Fix escaped quotes that might cause issues
    # Sometimes LLMs double-escape quotes
    text = text.replace('\\"', '"')
    
    # Pattern 6: Remove any text before the first { and after the last }
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]
    
    # Validate it looks like JSON
    if not text.startswith('{'):
        print(f"[WARNING] Response doesn't look like JSON: {text[:100]}...")
        return "{}"
    
    return text


def call_llm(prompt: str, model_type: str = 'flash') -> str:
    """
    Calls the specified LLM provider and returns a JSON string.
    
    Args:
        prompt (str): The input prompt.
        model_type (str): 'flash' for Haiku (fast), 'pro' for Sonnet (powerful).
    
    Returns:
        str: The raw JSON response string.
    
    Raises:
        Exception: If the LLM call fails.
    """
    system_prompt = "Output valid JSON only."
    
    if model_type == 'flash':
        try:
            # Using Claude Haiku 4.5 for faster/cheaper queries
            message = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            result = _clean_json_response(message.content[0].text)
            print(f"[DEBUG] Haiku Response: {result[:500]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Haiku API Error: {e}")
            raise Exception(f"Haiku API Error: {e}")

    elif model_type == 'pro':
        try:
            # Using Claude Sonnet for complex queries
            message = anthropic_client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            result = _clean_json_response(message.content[0].text)
            print(f"[DEBUG] Sonnet Response: {result[:500]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Sonnet API Error: {e}")
            raise Exception(f"Sonnet API Error: {e}")

    else:
        raise Exception(f"Unknown model_type '{model_type}'")


def call_llm_raw(prompt: str, model_type: str = 'flash') -> str:
    """
    Calls the LLM and returns the RAW response without JSON cleaning.
    Use this for non-JSON responses like plain text summaries or arrays.
    
    Args:
        prompt (str): The input prompt.
        model_type (str): 'flash' for Haiku (fast), 'pro' for Sonnet (powerful).
    
    Returns:
        str: The raw response text.
    """
    if model_type == 'flash':
        try:
            message = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            result = message.content[0].text.strip()
            print(f"[DEBUG] Haiku Raw Response: {result[:200]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Haiku API Error: {e}")
            raise Exception(f"Haiku API Error: {e}")

    elif model_type == 'pro':
        try:
            message = anthropic_client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            result = message.content[0].text.strip()
            print(f"[DEBUG] Sonnet Raw Response: {result[:200]}...")
            return result
        except Exception as e:
            print(f"[ERROR] Sonnet API Error: {e}")
            raise Exception(f"Sonnet API Error: {e}")

    else:
        raise Exception(f"Unknown model_type '{model_type}'")
