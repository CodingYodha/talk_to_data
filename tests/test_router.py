from router import determine_complexity

def test_router():
    print("--- Testing determine_complexity ---")
    
    test_cases = [
        ("Show me all tracks", "flash"),
        ("Who is the highest selling artist?", "pro"),
        ("Compare sales between January and February", "pro"),
        ("What is the ratio of rock to jazz?", "pro"),
        ("List albums by AC/DC", "flash"),
        ("Show me the trend of sales over time", "pro"),
        ("Which track has the lowest popularity?", "pro"),
        ("Songs that were never bought", "pro"),
        ("Who are the customers from Brazil?", "pro") # 'who' is in the list
    ]
    
    for query, expected in test_cases:
        result = determine_complexity(query)
        print(f"Query: '{query}' -> Result: {result}, Expected: {expected}")
        if result != expected:
            print(f"FAILED for '{query}'")
        assert result == expected
        
    print("\nAll tests passed successfully!")

if __name__ == "__main__":
    test_router()
