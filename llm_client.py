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
    """
    if model_type == 'flash':
        try:
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            response = model.generate_content(prompt)
            return _clean_json_response(response.text)
        except Exception as e:
            return f"Error calling Gemini: {e}"

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
            return _clean_json_response(message.content[0].text)
        except Exception as e:
            return f"Error calling Anthropic: {e}"

    else:
        return f"Error: Unknown model_type '{model_type}'"
