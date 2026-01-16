import sqlite3
import pandas as pd
import os

class db_manager:
    def __init__(self, db_path="assets/chinook.db"):
        self.db_path = db_path

    def get_connection(self):
        """Creates and returns a connection to the database."""
        return sqlite3.connect(self.db_path)

    def get_schema_summary(self):
        """
        Iterates through all tables and returns a formatted string 
        containing the Table Name and Column Names for each table.
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
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
                column_names = [col[1] for col in columns]
                
                summary_parts.append(f"Table: {table_name}")
                summary_parts.append(f"Columns: {', '.join(column_names)}")
                summary_parts.append("") # Empty line for separation
                
            return "\n".join(summary_parts).strip()
            
        except sqlite3.Error as e:
            return f"Error retrieving schema: {e}"
        finally:
            conn.close()

    def execute_query(self, sql_query):
        """
        Executes a SQL query against the database.
        Enforces Read-Only access by blocking harmful commands.
        
        Returns:
            tuple: (result_dataframe, error_message)
        """
        forbidden_keywords = ["DROP", "DELETE", "INSERT", "UPDATE"]
        
        # simple check, case-insensitive
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
