import sqlite3
import pandas as pd
import os

class DBManager:
    """Database manager for SQLite operations."""
    
    def __init__(self, db_path: str = None):
        # Default path relative to backend directory
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "assets", "chinook.db")
        self.db_path = db_path

    def get_connection(self):
        """Creates and returns a connection to the database."""
        return sqlite3.connect(self.db_path)

    def get_schema_summary(self) -> str:
        """
        Iterates through all tables and returns a formatted string 
        containing the Table Name, Column Names, and first 2 sample rows.
        Sample data helps LLM understand data types and formats.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Get list of tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            summary_parts = []
            
            for table in tables:
                table_name = table[0]
                
                # Get column info
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
                column_names = [col[1] for col in columns]
                column_types = [f"{col[1]} ({col[2]})" for col in columns]
                
                summary_parts.append(f"Table: {table_name}")
                summary_parts.append(f"Columns: {', '.join(column_types)}")
                
                # Get first 2 sample rows
                try:
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 2;")
                    sample_rows = cursor.fetchall()
                    
                    if sample_rows:
                        summary_parts.append("Sample Data:")
                        for i, row in enumerate(sample_rows, 1):
                            # Format each value, truncating long strings
                            formatted_values = []
                            for val in row:
                                if val is None:
                                    formatted_values.append("NULL")
                                elif isinstance(val, str) and len(val) > 30:
                                    formatted_values.append(f"'{val[:30]}...'")
                                elif isinstance(val, str):
                                    formatted_values.append(f"'{val}'")
                                else:
                                    formatted_values.append(str(val))
                            summary_parts.append(f"  Row {i}: ({', '.join(formatted_values)})")
                except sqlite3.Error:
                    summary_parts.append("Sample Data: Unable to fetch")
                
                summary_parts.append("")  # Empty line for separation
                
            return "\n".join(summary_parts).strip()
            
        except sqlite3.Error as e:
            return f"Error retrieving schema: {e}"
        finally:
            conn.close()

    def execute_query(self, sql_query: str) -> tuple:
        """
        Executes a SQL query against the database.
        Enforces Read-Only access by blocking harmful commands.
        
        Returns:
            tuple: (result_dataframe, error_message)
        """
        forbidden_keywords = ["DROP", "DELETE", "INSERT", "UPDATE"]
        
        # Simple check, case-insensitive
        query_upper = sql_query.upper()
        for keyword in forbidden_keywords:
            if keyword in query_upper:
                return None, f"ValueError: Query contains forbidden keyword '{keyword}'. This function is Read-Only."
        
        conn = self.get_connection()
        try:
            df = pd.read_sql(sql_query, conn)
            # Round float columns to 2 decimal places
            for col in df.select_dtypes(include=['float']).columns:
                df[col] = df[col].round(2)
                
            return df, None
        except Exception as e:
            return None, str(e)
        finally:
            conn.close()
