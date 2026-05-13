
import g4f.api
import g4f

if __name__ == "__main__":
    print("Starting g4f API server on port 1337...")
    # Enable debugging for more info in logs
    g4f.debug.logging = True
    g4f.api.run_api(debug=True)
