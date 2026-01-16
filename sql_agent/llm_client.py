import os
import google.generativeai as genai
from anthropic import Anthropic
from dotenv import load_dotenv
import re

load_dotenv()

# Initialize Clients
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def _clean_json_response(response_text):
    """
    Strips Markdown code blocks (```json ... ```) and whitespace 
    to return a raw JSON string.
    """
    if not response_text:
        return ""
    
    # Remove ```json ... ``` or just ``` ... ```
    cleaned = re.sub(r"```(json)?", "", response_text, flags=re.IGNORECASE)
    cleaned = cleaned.replace("```", "")
    return cleaned.strip()

def call_llm(prompt, model_type='flash'):
    """
    Calls the specified LLM provider and returns a JSON string.
    
    Args:
        prompt (str): The input prompt.
        model_type (str): 'flash' for Gemini, 'pro' for Claude.
    
    Returns:
        str: The raw JSON response string.
    
    Raises:
        Exception: If the LLM call fails.
    """
    if model_type == 'flash':
        try:
            # Using Claude Haiku 4.5 for faster/cheaper queries
            system_prompt = "Output valid JSON only."
            
            message = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            result = _clean_json_response(message.content[0].text)
            print(f"[DEBUG] Haiku Response: {result[:500]}...")  # Debug log
            return result
        except Exception as e:
            print(f"[ERROR] Haiku API Error: {e}")
            raise Exception(f"Haiku API Error: {e}")

    elif model_type == 'pro':
        try:
            # Anthropic doesn't have a JSON mode param like Gemini, 
            # so we enforce it via system prompt/instruction.
            system_prompt = "Output valid JSON only."
            
            message = anthropic_client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            result = _clean_json_response(message.content[0].text)
            print(f"[DEBUG] Claude Response: {result[:500]}...")  # Debug log
            return result
        except Exception as e:
            print(f"[ERROR] Anthropic API Error: {e}")
            raise Exception(f"Anthropic API Error: {e}")

    else:
        raise Exception(f"Unknown model_type '{model_type}'")
