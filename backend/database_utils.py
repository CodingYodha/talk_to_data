"""
Universal Database Connector with Hot-Swap Support
Supports SQLite, PostgreSQL, MySQL via SQLAlchemy.
Allows live database switching without server restart.
"""

import os
import shutil
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
    Includes hot-swap capability for live database switching.
    """
    
    _engine: Optional[Engine] = None
    _connection_url: str = ""
    _schema_cache: Optional[str] = None  # Cached schema for performance
    _current_db_path: Optional[str] = None  # Track current SQLite file
    _is_custom_db: bool = False  # Whether using user-uploaded DB
    
    # Default demo database path
    DEFAULT_DB_NAME = "chinook.db"
    UPLOAD_DB_NAME = "user_database.db"
    
    @classmethod
    def _get_db_directory(cls) -> str:
        """Get the assets directory for database files."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base_dir, "assets")
    
    @classmethod
    def _get_default_db_path(cls) -> str:
        """Get path to the default demo database."""
        return os.path.join(cls._get_db_directory(), cls.DEFAULT_DB_NAME)
    
    @classmethod
    def _get_upload_db_path(cls) -> str:
        """Get path for user-uploaded database."""
        return os.path.join(cls._get_db_directory(), cls.UPLOAD_DB_NAME)
    
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
            cls._current_db_path = None
            print(f"[DB] Connecting to external database...")
        else:
            # Use local SQLite - check if custom DB exists
            if cls._is_custom_db and os.path.exists(cls._get_upload_db_path()):
                db_path = cls._get_upload_db_path()
                print(f"[DB] Connecting to user database: {db_path}")
            else:
                db_path = cls._get_default_db_path()
                print(f"[DB] Connecting to default SQLite: {db_path}")
            
            cls._current_db_path = db_path
            cls._connection_url = f"sqlite:///{db_path}"
        
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
    def _clear_cache(cls):
        """Clear schema cache - forces re-read on next query."""
        cls._schema_cache = None
        print("[DB] Schema cache cleared")
    
    @classmethod
    def _dispose_engine(cls):
        """Dispose current engine and clear all connections."""
        if cls._engine is not None:
            cls._engine.dispose()
            cls._engine = None
            cls._connection_url = ""
            print("[DB] Engine disposed")
    
    @classmethod
    def switch_database(cls, new_db_path: str) -> Tuple[bool, str]:
        """
        Switch to a new SQLite database file.
        
        Args:
            new_db_path: Path to the new .db file
            
        Returns:
            (success: bool, message: str)
        """
        # Validate file exists
        if not os.path.exists(new_db_path):
            return False, f"Database file not found: {new_db_path}"
        
        # Validate it's a valid SQLite file
        try:
            test_engine = create_engine(f"sqlite:///{new_db_path}")
            with test_engine.connect() as conn:
                # Try to list tables
                inspector = inspect(test_engine)
                tables = inspector.get_table_names()
                if not tables:
                    return False, "Database has no tables"
            test_engine.dispose()
        except Exception as e:
            return False, f"Invalid database file: {str(e)}"
        
        # Copy to upload location
        upload_path = cls._get_upload_db_path()
        try:
            shutil.copy2(new_db_path, upload_path)
        except Exception as e:
            return False, f"Failed to save database: {str(e)}"
        
        # Dispose old engine and switch
        cls._dispose_engine()
        cls._clear_cache()
        cls._is_custom_db = True
        
        # Force new engine creation
        engine = cls.get_engine()
        
        # Get table count for confirmation
        inspector = inspect(engine)
        table_count = len(inspector.get_table_names())
        
        # Clear query cache in agent_engine
        try:
            from agent_engine import query_cache
            query_cache.clear()
            print("[DB] Query cache cleared")
        except ImportError:
            pass
        
        return True, f"Switched to new database with {table_count} tables"
    
    @classmethod
    def reset_to_default(cls) -> Tuple[bool, str]:
        """
        Reset to the default demo database.
        
        Returns:
            (success: bool, message: str)
        """
        # Remove user database if exists
        upload_path = cls._get_upload_db_path()
        if os.path.exists(upload_path):
            try:
                os.remove(upload_path)
                print(f"[DB] Removed user database: {upload_path}")
            except Exception as e:
                return False, f"Failed to remove user database: {str(e)}"
        
        # Dispose old engine and switch back
        cls._dispose_engine()
        cls._clear_cache()
        cls._is_custom_db = False
        
        # Force new engine creation
        engine = cls.get_engine()
        
        # Get table count for confirmation
        inspector = inspect(engine)
        table_count = len(inspector.get_table_names())
        
        # Clear query cache
        try:
            from agent_engine import query_cache
            query_cache.clear()
        except ImportError:
            pass
        
        return True, f"Reset to default database with {table_count} tables"
    
    @classmethod
    def get_current_database_info(cls) -> Dict[str, Any]:
        """Get info about the currently connected database."""
        engine = cls.get_engine()
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        return {
            "type": engine.dialect.name,
            "is_custom": cls._is_custom_db,
            "table_count": len(tables),
            "tables": tables,
            "path": cls._current_db_path
        }
    
    @classmethod
    def get_schema_summary(cls) -> str:
        """
        Get database schema with sample rows.
        Uses cache for performance, clears on database switch.
        Works for SQLite, PostgreSQL, MySQL, etc.
        """
        # Return cached if available
        if cls._schema_cache is not None:
            return cls._schema_cache
        
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
            
            cls._schema_cache = "\n".join(summary_parts).strip()
            return cls._schema_cache
            
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
