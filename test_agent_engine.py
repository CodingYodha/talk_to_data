import agent_engine
import unittest
from unittest.mock import MagicMock
import pandas as pd

class TestAgentEngine(unittest.TestCase):
    
    def setUp(self):
        # Backup originals
        self.original_db_manager = agent_engine.db_manager
        self.original_call_llm = agent_engine.call_llm
        
    def tearDown(self):
        # Restore originals
        agent_engine.db_manager = self.original_db_manager
        agent_engine.call_llm = self.original_call_llm

    def test_success_first_attempt(self):
        print("\n--- Testing Success on Limit 1 ---")
        
        # Mock DB
        mock_db = MagicMock()
        mock_db.get_schema_summary.return_value = "Mock Schema"
        # Return dataframe, no error
        mock_df = pd.DataFrame([{"col": "val"}])
        mock_db.execute_query.return_value = (mock_df, None)
        agent_engine.db_manager = MagicMock(return_value=mock_db)
        
        # Mock LLM
        mock_resp = '{"thought_process": "Easy", "sql_query": "SELECT * FROM Success;"}'
        agent_engine.call_llm = MagicMock(return_value=mock_resp)
        
        result = agent_engine.process_question("Simple question")
        
        print(f"Result: {result['status']}")
        self.assertEqual(result["status"], "success")
        self.assertEqual(len(result["steps"]), 1)
        self.assertEqual(result["steps"][0]["sql"], "SELECT * FROM Success;")
        
    def test_retry_flow(self):
        print("\n--- Testing Retry Flow ---")
        
        # Mock DB
        mock_db = MagicMock()
        mock_db.get_schema_summary.return_value = "Mock Schema"
        
        # First call fails, Second call succeeds
        def execute_side_effect(sql):
            if "Fail" in sql:
                return None, "Syntax Error"
            else:
                return pd.DataFrame([{"col": "fixed"}]), None
                
        mock_db.execute_query.side_effect = execute_side_effect
        agent_engine.db_manager = MagicMock(return_value=mock_db)
        
        # Mock LLM
        # First returns bad SQL, Second returns good SQL
        def llm_side_effect(prompt, model_type):
            if "previous query failed" in prompt:
                return '{"thought_process": "Fixing", "sql_query": "SELECT * FROM Fixed;"}'
            else:
                return '{"thought_process": "Try 1", "sql_query": "SELECT * FROM Fail;"}'
                
        agent_engine.call_llm = MagicMock(side_effect=llm_side_effect)
        
        result = agent_engine.process_question("Hard question")
        
        print(f"Result Status: {result['status']}")
        print(f"Steps taken: {len(result['steps'])}")
        
        self.assertEqual(result["status"], "success")
        self.assertEqual(len(result["steps"]), 2)
        self.assertEqual(result["steps"][0]["error"], "Syntax Error")
        self.assertEqual(result["steps"][1]["sql"], "SELECT * FROM Fixed;")
        
        print("Success: Retry logic worked.")

if __name__ == "__main__":
    unittest.main()
