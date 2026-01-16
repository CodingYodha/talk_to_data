import agent_engine
import unittest
from unittest.mock import MagicMock

class TestAgentEngine(unittest.TestCase):
    
    def test_process_question_flow(self):
        print("--- Testing process_question (Mock) ---")
        
        # Mock dependencies to avoid real API/DB calls
        original_db_manager = agent_engine.db_manager
        original_call_llm = agent_engine.call_llm
        
        try:
            # Mock DB
            mock_db = MagicMock()
            mock_db.get_schema_summary.return_value = "Mock Schema"
            agent_engine.db_manager = MagicMock(return_value=mock_db)
            
            # Mock LLM
            mock_response_json = '{"thought_process": "Thinking...", "sql_query": "SELECT * FROM Mock;"}'
            agent_engine.call_llm = MagicMock(return_value=mock_response_json)
            
            # Run Test
            question = "Show me the top artists"
            result = agent_engine.process_question(question)
            
            print(f"Question: {question}")
            print(f"Result: {result}")
            
            # Assertions
            self.assertEqual(result["complexity"], "flash") # 'top' isn't in strict keyword list, 'highest' is.
            self.assertEqual(result["sql_query"], "SELECT * FROM Mock;")
            self.assertEqual(result["thought_process"], "Thinking...")
            
            print("Success: Flow orchestrated correctly.")
            
        finally:
            # Restore
            agent_engine.db_manager = original_db_manager
            agent_engine.call_llm = original_call_llm

if __name__ == "__main__":
    unittest.main()
