import subprocess, time, webbrowser, os, sys

def run_silent(cmd, cwd=None):
    """Run a command silently (no terminal window, no output)."""
    kwargs = {
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
        "cwd": cwd,
        "shell": True
    }
    
    # Hide terminal windown on windows
    if os.name == "nt":
        kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
        
    return subprocess.Popen(cmd, **kwargs)

# Start Flask backend
run_silent(["python", "semantic_search.py"], cwd="images")

# Start caddy
run_silent(['caddy', 'run'], cwd="images")

# Start frontend
run_silent(['npm', 'run', 'dev'], cwd="images/vanilla_frontend")

## Wait for services to start
time.sleep(4)

## Open the web app in browser
# webbrowser.open("http://localhost:5173")

print("All services started silently")