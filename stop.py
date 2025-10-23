import subprocess
import os

def kill_processes():
    """Kill the services started by start.py"""
    if os.name == "nt":  # Windows
        # Stop Caddy gracefully first
        print("Stopping Caddy...")
        try:
            result = subprocess.run(['caddy', 'stop'], shell=True, cwd="images")
            print(f"Caddy stop result: {result.returncode}")
        except Exception as e:
            print(f"Error stopping Caddy: {e}")
        
        # Kill specific Python process (semantic_search.py) - more targeted approach
        print("Stopping semantic_search.py...")
        try:
            # Use wmic to find and kill only processes with semantic_search.py in command line
            result = subprocess.run([
                'wmic', 'process', 'where', 
                'CommandLine like "%semantic_search.py%" and Name="python.exe"', 
                'delete'
            ], shell=True, capture_output=True, text=True)
            print(f"semantic_search.py kill result: {result.returncode}")
            if result.stdout:
                print(f"Output: {result.stdout}")
        except Exception as e:
            print(f"Error stopping semantic_search.py: {e}")
        
        # Kill Node.js dev server more selectively
        print("Stopping npm dev server...")
        try:
            # Kill the all node processes. with the kill command. Use taskKill to target node
            result = subprocess.run([
                'taskkill', '/F', '/IM', 'node.exe'
            ], shell=True, capture_output=True, text=True)
            print(f"npm dev server kill result: {result.returncode}")
            if result.stdout:
                print(f"Output: {result.stdout}")
        except Exception as e:
            print(f"Error stopping npm dev server: {e}")
        
        print("All Hachi services stopped")
        
    else:  # Linux/Mac
        subprocess.run(['caddy', 'stop'], cwd="images")
        subprocess.run(['pkill', '-f', 'semantic_search.py'])
        subprocess.run(['pkill', '-f', 'npm run dev'])
        print("All services stopped")

if __name__ == "__main__":
    print("Starting Hachi cleanup process...")
    try:
        kill_processes()
        print("Hachi cleanup completed successfully!")
    except Exception as e:
        print(f"Error during cleanup: {e}")