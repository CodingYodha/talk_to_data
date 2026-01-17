from sql_agent.database_utils import db_manager
import pandas as pd

def run_tests():
    db = db_manager()
    
    print("--- Testing get_schema_summary ---")
    summary = db.get_schema_summary()
    print(summary[:200] + "...\n") # Print first 200 chars
    
    print("--- Testing valid execute_query ---")
    df, error = db.execute_query("SELECT * FROM Album LIMIT 5")
    if error:
        print(f"Error: {error}")
    else:
        print(f"Success! Retrieved {len(df)} rows.")
        print(df.head(2))
    
    print("\n--- Testing Float Rounding ---")
    # Invoice table has Total which is numeric/float
    df_inv, error_inv = db.execute_query("SELECT Total FROM Invoice LIMIT 3")
    if error_inv:
        print(f"Error: {error_inv}")
    else:
        print(f"Retrieved Invoice Totals: {df_inv['Total'].tolist()}")
        # Check if they look rounded (not failing test, just visual)
    
    print("\n")

    print("--- Testing invalid execute_query (Forbidden) ---")
    _, error = db.execute_query("DELETE FROM Album WHERE AlbumId = 1")
    print(f"Result Error: {error}\n")
    
    print("--- Testing invalid execute_query (Syntax Error) ---")
    _, error = db.execute_query("SELECT * FROM non_existent_table")
    print(f"Result Error: {error}\n")

if __name__ == "__main__":
    run_tests()
