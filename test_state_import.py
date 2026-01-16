try:
    import state
    print("Successfully imported state module.")
    
    # Basic check of class existence
    msg = state.Message(role="user", content="hello")
    print(f"Message class works: {msg.role}")
    
    # Check State class existence (instantiation requires Reflex runtime usually, 
    # but we can check the class definition)
    assert hasattr(state.State, "handle_submit")
    print("State class has handle_submit.")
    
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
