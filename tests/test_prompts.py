from prompts import build_system_prompt

def test_prompts():
    print("--- Testing build_system_prompt ---")
    
    dummy_schema = """
    Table: Album
    Columns: AlbumId, Title, ArtistId
    """
    
    prompt = build_system_prompt(dummy_schema)
    print(prompt)
    
    # Assertions to ensure key requirements are present
    assert "Chinook music database" in prompt
    assert dummy_schema in prompt
    assert '"thought_process"' in prompt
    assert '"sql_query"' in prompt
    assert "LIMIT 20" in prompt
    assert "NEVER generate DML" in prompt
    
    print("\n\n--- Verification Passed ---")
    print("Prompt contains all required components: Context, Schema, JSON Structure, and Rules.")

if __name__ == "__main__":
    test_prompts()
