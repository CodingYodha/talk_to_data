def determine_complexity(user_query: str) -> str:
    """
    Determines if a query requires a 'pro' model based on keywords.
    
    Args:
        user_query (str): The user's input query.
        
    Returns:
        str: 'pro' or 'flash'
    """
    query_lower = user_query.lower()
    
    complex_keywords = [
        'compare', 'ratio', 'trend', 'difference', 
        'highest', 'lowest', 'who', 'which', 'never', 'most'
    ]
    
    for keyword in complex_keywords:
        if keyword in query_lower:
            return 'pro'
            
    return 'flash'
