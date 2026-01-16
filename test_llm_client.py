from llm_client import call_llm, _clean_json_response

def test_cleaning():
    print("--- Testing JSON Cleaning ---")
    raw = "```json\n{\"key\": \"value\"}\n```"
    cleaned = _clean_json_response(raw)
    print(f"Original: {raw!r}")
    print(f"Cleaned:  {cleaned!r}")
    assert cleaned == '{"key": "value"}'
    print("Success!\n")

def test_call_llm_mock():
    print("--- Testing call_llm (Mock) ---")
    # NOTE: This test will likely fail if API keys are not set or valid.
    # We are just initializing the module to check for syntax errors 
    # and basic logic flow if we were to mock the internal calls.
    
    import llm_client
    
    # Mocking for demonstration if you don't have keys during this run
    # This just proves the function structure is correct.
    original_genai = llm_client.genai
    original_anthropic = llm_client.anthropic_client
    
    class MockGenaiModel:
        def __init__(self, model_name, generation_config):
            pass
        def generate_content(self, prompt):
            class Resp:
                text = '{"mock": "gemini"}'
            return Resp()
            
    class MockAnthropic:
        class messages:
            @staticmethod
            def create(model, max_tokens, system, messages):
                class Content:
                    text = '{"mock": "claude"}'
                class Msg:
                    content = [Content()]
                return Msg()

    # Inject mocks
    llm_client.genai.GenerativeModel = MockGenaiModel
    llm_client.anthropic_client = MockAnthropic()
    
    print("Testing 'flash'...")
    res_flash = call_llm("test", "flash")
    print(f"Result: {res_flash}")
    assert 'gemini' in res_flash
    
    print("Testing 'pro'...")
    res_pro = call_llm("test", "pro")
    print(f"Result: {res_pro}")
    assert 'claude' in res_pro
    
    print("Success!\n")

    # Restore (though script ends here)
    llm_client.genai = original_genai
    llm_client.anthropic_client = original_anthropic

if __name__ == "__main__":
    test_cleaning()
    test_call_llm_mock()
