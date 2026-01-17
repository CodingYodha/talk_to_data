"""
Universal Database Connector
Supports SQLite, PostgreSQL, MySQL via SQLAlchemy.
Switch databases by changing DATABASE_URL in config.
"""

import os
from typing import Tuple, Optional, List, Dict, Any
from sqlalchemy import create_engine, text, inspect, MetaData
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
import pandas as pd

from config import get_settings


class DatabaseManager:
    """
    Universal database manager using SQLAlchemy.
    Supports SQLite, PostgreSQL, MySQL, and other SQLAlchemy-compatible databases.
    """
    
    _engine: Optional[Engine] = None
    _connection_url: str = ""
    
    @classmethod
    def get_engine(cls) -> Engine:
        """
        Get or create SQLAlchemy engine.
        Uses DATABASE_URL if set, otherwise falls back to SQLite.
        """
        if cls._engine is not None:
            return cls._engine
        
        settings = get_settings()
        
        # Determine connection URL
        if settings.DATABASE_URL:
            # Use external database (PostgreSQL, MySQL, etc.)
            cls._connection_url = settings.DATABASE_URL
            print(f"[DB] Connecting to external database...")
        else:
            # Use local SQLite
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "assets", settings.DATABASE_PATH)
            cls._connection_url = f"sqlite:///{db_path}"
            print(f"[DB] Connecting to SQLite: {db_path}")
        
        cls._engine = create_engine(
            cls._connection_url,
            echo=settings.DEBUG,
            pool_pre_ping=True  # Health check connections
        )
        
        return cls._engine
    
    @classmethod
    def get_connection(cls):
        """Get a database connection from the engine."""
        return cls.get_engine().connect()
    
    @classmethod
    def get_schema_summary(cls) -> str:
        """
        Get database schema with sample rows.
        Works for SQLite, PostgreSQL, MySQL, etc.
        """
        engine = cls.get_engine()
        inspector = inspect(engine)
        
        summary_parts = []
        
        try:
            # Get all table names
            tables = inspector.get_table_names()
            
            for table_name in tables:
                # Get columns
                columns = inspector.get_columns(table_name)
                column_info = [f"{col['name']} ({col['type']})" for col in columns]
                
                summary_parts.append(f"Table: {table_name}")
                summary_parts.append(f"Columns: {', '.join(column_info)}")
                
                # Get sample rows (works across all databases)
                try:
                    with engine.connect() as conn:
                        # Use LIMIT syntax (SQLite, PostgreSQL, MySQL all support this)
                        result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT 2"))
                        rows = result.fetchall()
                        
                        if rows:
                            summary_parts.append("Sample Data:")
                            for i, row in enumerate(rows, 1):
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
                except SQLAlchemyError as e:
                    summary_parts.append(f"Sample Data: Unable to fetch ({str(e)[:50]})")
                
                summary_parts.append("")  # Empty line for separation
            
            return "\n".join(summary_parts).strip()
            
        except SQLAlchemyError as e:
            return f"Error retrieving schema: {e}"
    
    @classmethod
    def execute_query(cls, sql_query: str) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
        """
        Execute a SQL query with safety checks.
        Enforces read-only access.
        
        Returns:
            tuple: (dataframe, error_message)
        """
        # Block dangerous operations
        forbidden_keywords = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "TRUNCATE", "CREATE"]
        query_upper = sql_query.upper()
        
        for keyword in forbidden_keywords:
            if keyword in query_upper:
                return None, f"SecurityError: Query contains forbidden keyword '{keyword}'. Read-only mode enforced."
        
        engine = cls.get_engine()
        
        try:
            with engine.connect() as conn:
                df = pd.read_sql(sql_query, conn)
                
                # Round float columns
                for col in df.select_dtypes(include=['float']).columns:
                    df[col] = df[col].round(2)
                
                return df, None
                
        except SQLAlchemyError as e:
            return None, str(e)
    
    @classmethod
    def health_check(cls) -> bool:
        """Test database connectivity."""
        try:
            engine = cls.get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError:
            return False
    
    @classmethod
    def get_database_type(cls) -> str:
        """Get the database dialect (sqlite, postgresql, mysql, etc.)."""
        engine = cls.get_engine()
        return engine.dialect.name


# ============ BACKWARD COMPATIBILITY ============
# Keep DBManager as alias for existing code

class DBManager:
    """
    Backward-compatible wrapper around DatabaseManager.
    Maintains same interface as original database_utils.py.
    """
    
    def __init__(self, db_path: str = None):
        """Initialize (path argument ignored - uses config)."""
        self._manager = DatabaseManager
    
    def get_connection(self):
        """Get database connection."""
        return DatabaseManager.get_connection()
    
    def get_schema_summary(self) -> str:
        """Get schema with sample rows."""
        return DatabaseManager.get_schema_summary()
    
    def execute_query(self, sql_query: str) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
        """Execute query with safety checks."""
        return DatabaseManager.execute_query(sql_query)
