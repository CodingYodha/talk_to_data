# verification_script.py

import json
import requests
import time
import subprocess
import sys
import os

def run_server():
    """Start the uvicorn server in a subprocess."""
    print("Starting server...")
    # Using cwd as the backend directory so imports work
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=r"e:\blueberry_marketwise\talk_to_data\backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    time.sleep(5)  # Wait for server to start
    return proc

def test_query():
    """Send a test query to the server."""
    url = "http://127.0.0.1:8000/api/query"
    payload = {
        "question": "Show me the top 5 tracks",
        "previous_sql": None
    }
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
            
        if response.status_code == 200:
            print("\nPASS: Request successful.")
        else:
            print("\nFAIL: Request failed.")
            
    except Exception as e:
        print(f"\nFAIL: Request exception: {e}")

def main():
    proc = run_server()
    try:
        test_query()
    finally:
        print("Killing server...")
        proc.terminate()
        try:
            stdout, stderr = proc.communicate(timeout=2)
            if stdout: print(f"Server STDOUT:\n{stdout}")
            if stderr: print(f"Server STDERR:\n{stderr}")
        except:
            proc.kill()

if __name__ == "__main__":
    main()
