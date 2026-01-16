"""
Deep Analysis Engine - Automated Data Visualization & Insights
Provides heuristic-based chart selection with LLM fallback.
"""

import pandas as pd
import numpy as np
import json
from typing import Dict, List, Any, Optional, Tuple
from llm_client import call_llm


# ============ TYPE DETECTION ============

def detect_column_types(df: pd.DataFrame) -> Dict[str, str]:
    """
    Detect column data types: 'numeric', 'datetime', 'categorical'.
    """
    types = {}
    for col in df.columns:
        # Check datetime
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            types[col] = 'datetime'
        elif df[col].dtype in ['object', 'string']:
            # Try to parse as datetime
            try:
                parsed = pd.to_datetime(df[col], errors='coerce')
                if parsed.notna().sum() > len(df) * 0.7:  # 70% valid dates
                    types[col] = 'datetime'
                else:
                    types[col] = 'categorical'
            except:
                types[col] = 'categorical'
        elif pd.api.types.is_numeric_dtype(df[col]):
            types[col] = 'numeric'
        else:
            types[col] = 'categorical'
    return types


# ============ PREPROCESSING ============

def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Preprocess dataframe: fill NaN values, clean data.
    """
    df = df.copy()
    
    # Fill numeric NaN with 0
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].fillna(0)
    
    # Fill categorical NaN with 'Unknown'
    for col in df.select_dtypes(include=['object', 'string']).columns:
        df[col] = df[col].fillna('Unknown')
    
    return df


def encode_for_correlation(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encode low-cardinality categorical columns for correlation analysis.
    Uses Label Encoding / Factorization.
    """
    encoded = df.copy()
    
    for col in encoded.select_dtypes(include=['object', 'string']).columns:
        # Only encode low-cardinality columns (< 20 unique values)
        if encoded[col].nunique() < 20:
            try:
                encoded[col] = pd.Categorical(encoded[col]).codes
            except:
                # Drop if encoding fails
                encoded = encoded.drop(columns=[col])
        else:
            # Drop high-cardinality columns
            encoded = encoded.drop(columns=[col])
    
    return encoded


# ============ HEURISTIC ANALYSIS ============

def analyze_trend(df: pd.DataFrame, col_types: Dict[str, str]) -> Optional[Dict]:
    """
    Check for trend pattern: Date + Numeric columns → Line Chart.
    """
    datetime_cols = [c for c, t in col_types.items() if t == 'datetime']
    numeric_cols = [c for c, t in col_types.items() if t == 'numeric']
    
    if datetime_cols and numeric_cols:
        x_col = datetime_cols[0]
        y_col = numeric_cols[0]
        
        # Sort by date and prepare data
        sorted_df = df.sort_values(x_col).copy()
        
        # Convert datetime to string for JSON
        if pd.api.types.is_datetime64_any_dtype(sorted_df[x_col]):
            sorted_df[x_col] = sorted_df[x_col].dt.strftime('%Y-%m-%d')
        
        data = sorted_df[[x_col, y_col]].head(50).to_dict('records')
        
        return {
            "type": "line",
            "x_key": x_col,
            "y_key": y_col,
            "data": data,
            "confidence": 0.9,
            "reason": f"Time series detected: {x_col} vs {y_col}"
        }
    
    return None


def analyze_comparison(df: pd.DataFrame, col_types: Dict[str, str]) -> Optional[Dict]:
    """
    Check for comparison pattern: Categorical + Numeric → Bar Chart.
    """
    categorical_cols = [c for c, t in col_types.items() if t == 'categorical']
    numeric_cols = [c for c, t in col_types.items() if t == 'numeric']
    
    if categorical_cols and numeric_cols:
        x_col = categorical_cols[0]
        y_col = numeric_cols[0]
        
        # Limit to top 15 categories by numeric value
        grouped = df.groupby(x_col)[y_col].sum().nlargest(15).reset_index()
        data = grouped.to_dict('records')
        
        return {
            "type": "bar",
            "x_key": x_col,
            "y_key": y_col,
            "data": data,
            "confidence": 0.85,
            "reason": f"Category comparison: {x_col} by {y_col}"
        }
    
    return None


def analyze_distribution(df: pd.DataFrame, col_types: Dict[str, str]) -> Optional[Dict]:
    """
    Check for distribution pattern: Single Numeric → Histogram.
    """
    numeric_cols = [c for c, t in col_types.items() if t == 'numeric']
    
    if len(numeric_cols) == 1 and len(col_types) <= 2:
        col = numeric_cols[0]
        
        # Create histogram bins
        values = df[col].dropna()
        if len(values) > 0:
            hist, bin_edges = np.histogram(values, bins=min(20, len(values)))
            data = [
                {"bin": f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}", "count": int(hist[i])}
                for i in range(len(hist))
            ]
            
            return {
                "type": "histogram",
                "x_key": "bin",
                "y_key": "count",
                "data": data,
                "confidence": 0.8,
                "reason": f"Distribution of {col}"
            }
    
    return None


def analyze_relationship(df: pd.DataFrame, col_types: Dict[str, str]) -> Optional[Dict]:
    """
    Check for relationships: Calculate correlation matrix.
    Strong correlation (> 0.7 or < -0.7) → Scatter Plot.
    """
    # Encode categorical for correlation
    encoded = encode_for_correlation(df)
    numeric_df = encoded.select_dtypes(include=[np.number])
    
    if len(numeric_df.columns) < 2:
        return None
    
    try:
        corr_matrix = numeric_df.corr()
        
        # Find strongest correlation (excluding diagonal)
        np.fill_diagonal(corr_matrix.values, 0)
        
        max_corr = corr_matrix.abs().max().max()
        
        if max_corr > 0.7:
            # Find the pair with max correlation
            for col1 in corr_matrix.columns:
                for col2 in corr_matrix.columns:
                    if col1 != col2 and abs(corr_matrix.loc[col1, col2]) == max_corr:
                        # Use original columns if available
                        x_col = col1 if col1 in df.columns else numeric_df.columns[0]
                        y_col = col2 if col2 in df.columns else numeric_df.columns[1]
                        
                        data = df[[x_col, y_col]].head(100).to_dict('records')
                        
                        return {
                            "type": "scatter",
                            "x_key": x_col,
                            "y_key": y_col,
                            "data": data,
                            "confidence": 0.85,
                            "reason": f"Strong correlation ({max_corr:.2f}) between {x_col} and {y_col}"
                        }
    except Exception as e:
        print(f"[ANALYSIS] Correlation error: {e}")
    
    return None


def run_heuristics(df: pd.DataFrame) -> Optional[Dict]:
    """
    Run all heuristic analyzers in priority order.
    """
    # Preprocess
    df = preprocess_data(df)
    col_types = detect_column_types(df)
    
    print(f"[ANALYSIS] Column types: {col_types}")
    
    # Try each analyzer in order
    analyzers = [
        ("Trend", analyze_trend),
        ("Comparison", analyze_comparison),
        ("Distribution", analyze_distribution),
        ("Relationship", analyze_relationship),
    ]
    
    for name, analyzer in analyzers:
        try:
            result = analyzer(df, col_types)
            if result and result.get("confidence", 0) >= 0.7:
                print(f"[ANALYSIS] {name} pattern detected: {result.get('reason')}")
                return result
        except Exception as e:
            print(f"[ANALYSIS] {name} analyzer error: {e}")
    
    return None


# ============ LLM VARIABLE SELECTION (TOKEN EFFICIENT) ============

def llm_select_variables(df: pd.DataFrame, user_question: str) -> Optional[Dict]:
    """
    Use LLM to intelligently select which variables to analyze.
    Token-efficient: Only sends column names with types.
    """
    col_types = detect_column_types(df)
    
    # Build concise column summary with types
    col_summary = []
    numeric_cols = []
    for col in df.columns:
        ctype = col_types.get(col, 'unknown')
        sample = str(df[col].iloc[0]) if len(df) > 0 else "N/A"
        if len(sample) > 20:
            sample = sample[:17] + "..."
        col_summary.append(f"{col} ({ctype}): {sample}")
        if ctype == 'numeric':
            numeric_cols.append(col)
    
    # If no numeric columns, can't make a meaningful chart
    if not numeric_cols:
        print("[LLM] No numeric columns found for Y-axis")
        return None
    
    prompt = f"""Pick columns for a chart. X=category/label, Y=MUST be numeric.

COLUMNS:
{chr(10).join(col_summary)}

NUMERIC COLUMNS (use one for Y): {', '.join(numeric_cols)}

Reply JSON: {{"x":"col_name","y":"numeric_col","chart":"bar|line|scatter"}}"""

    try:
        response = call_llm(prompt, model_type='flash')
        config = json.loads(response)
        
        x_key = config.get("x", df.columns[0])
        y_key = config.get("y", numeric_cols[0])  # Default to first numeric
        chart_type = config.get("chart", "bar")
        
        # Validate columns exist
        if x_key not in df.columns:
            x_key = df.columns[0]
        
        # CRITICAL: Y must be numeric
        if y_key not in numeric_cols:
            y_key = numeric_cols[0]
        
        # Don't compare same column
        if x_key == y_key and len(df.columns) > 1:
            other_cols = [c for c in df.columns if c != x_key]
            x_key = other_cols[0] if other_cols else x_key
        
        print(f"[LLM] Selected: {x_key} vs {y_key} ({chart_type})")
        return {"x_key": x_key, "y_key": y_key, "chart_type": chart_type}
        
    except Exception as e:
        print(f"[LLM] Variable selection failed: {e}")
        return None


# ============ MAIN ANALYSIS FUNCTION ============

def analyze_data(data: List[Dict], user_question: str = "") -> Dict[str, Any]:
    """
    Main entry point for data analysis.
    Uses LLM for smart variable selection, then rule-based plotting.
    """
    # Validation: No data
    if not data or len(data) == 0:
        return {
            "success": False,
            "error": "No data to analyze",
            "chart_config": None,
            "insight_summary": "No data available for analysis."
        }
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Validation: Need at least 2 rows
    if len(df) < 2:
        return {
            "success": False,
            "error": "Need at least 2 rows for analysis",
            "chart_config": None,
            "insight_summary": "Insufficient data - need at least 2 rows."
        }
    
    # Validation: Need at least 2 columns
    if len(df.columns) < 2:
        return {
            "success": False,
            "error": "Need at least 2 columns for analysis",
            "chart_config": None,
            "insight_summary": "Insufficient data - need at least 2 columns."
        }
    
    print(f"[ANALYSIS] Analyzing {len(df)} rows x {len(df.columns)} columns")
    
    # Preprocess data
    df = preprocess_data(df)
    
    # Step 1: Use LLM to select meaningful variables
    llm_selection = llm_select_variables(df, user_question)
    
    if llm_selection:
        x_key = llm_selection["x_key"]
        y_key = llm_selection["y_key"]
        chart_type = llm_selection["chart_type"]
        
        # Don't analyze same-named variables
        if x_key == y_key:
            return {
                "success": False,
                "error": "Cannot compare variable with itself",
                "chart_config": None,
                "insight_summary": "Need two different variables for analysis."
            }
        
        # Prepare chart data based on type
        try:
            if chart_type == "pie":
                chart_data = df.groupby(x_key)[y_key].sum().head(10).reset_index().to_dict('records')
            elif chart_type == "line":
                chart_data = df.sort_values(x_key)[[x_key, y_key]].head(50).to_dict('records')
            else:  # bar, scatter
                chart_data = df[[x_key, y_key]].head(30).to_dict('records')
            
            insight = generate_insight_summary(df, {"x_key": x_key, "y_key": y_key, "type": chart_type})
            
            return {
                "success": True,
                "chart_config": {
                    "type": chart_type,
                    "x_key": x_key,
                    "y_key": y_key,
                    "data": chart_data
                },
                "insight_summary": insight
            }
        except Exception as e:
            print(f"[ANALYSIS] Chart prep error: {e}")
    
    # Fallback to heuristics if LLM fails
    print("[ANALYSIS] LLM selection failed, trying heuristics...")
    result = run_heuristics(df)
    
    if result:
        insight = generate_insight_summary(df, result)
        return {
            "success": True,
            "chart_config": {
                "type": result["type"],
                "x_key": result["x_key"],
                "y_key": result["y_key"],
                "data": result["data"]
            },
            "insight_summary": insight
        }
    
    # Ultimate fallback
    return create_fallback_chart(df)


def generate_insight_summary(df: pd.DataFrame, chart_result: Dict) -> str:
    """
    Generate statistical insight summary for the data.
    """
    insights = []
    
    # Basic stats
    insights.append(f"Analyzed {len(df)} records across {len(df.columns)} columns.")
    
    # Chart-specific insight
    if chart_result.get("reason"):
        insights.append(chart_result["reason"])
    
    # Numeric stats
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        col = numeric_cols[0]
        mean_val = df[col].mean()
        max_val = df[col].max()
        min_val = df[col].min()
        insights.append(f"{col}: avg={mean_val:.2f}, range=[{min_val:.2f} - {max_val:.2f}]")
    
    return " ".join(insights)


def create_fallback_chart(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Create a basic fallback chart when all analysis fails.
    """
    # Use first two columns as X/Y
    x_col = df.columns[0]
    y_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]
    
    data = df[[x_col, y_col]].head(20).to_dict('records')
    
    return {
        "success": True,
        "chart_config": {
            "type": "bar",
            "x_key": x_col,
            "y_key": y_col,
            "data": data
        },
        "insight_summary": f"Showing {x_col} vs {y_col}. {len(df)} total records."
    }
