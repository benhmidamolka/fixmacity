#!/usr/bin/env python3
"""
G4F API Server Setup and Runner
Installs g4f and runs the API server on http://localhost:1337
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a shell command and report status."""
    print(f"\n📦 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} succeeded")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"STDERR: {e.stderr}")
        print(f"STDOUT: {e.stdout}")
        return False

def main():
    print("=" * 60)
    print("🚀 FixMaCity G4F Setup & Runner")
    print("=" * 60)
    
    # Step 1: Upgrade pip
    run_command("python -m pip install --upgrade pip", "Upgrading pip")
    
    # Step 2: Install g4f
    print("\n🔍 Checking if g4f is installed...")
    try:
        import g4f
        print("✅ g4f is already installed")
    except ImportError:
        print("📥 Installing g4f...")
        success = run_command("pip install -U g4f", "Installing g4f")
        if not success:
            print("\n⚠️  Installation with 'g4f' failed, trying 'g4f[all]'...")
            success = run_command("pip install -U \"g4f[all]\"", "Installing g4f with extras")
            if not success:
                print("\n❌ Failed to install g4f. Please install manually:")
                print("   pip install -U g4f")
                sys.exit(1)
    
    # Step 3: Start the API server
    print("\n" + "=" * 60)
    print("🌐 Starting G4F API Server")
    print("=" * 60)
    print("Server will run on: http://localhost:1337")
    print("Press Ctrl+C to stop the server")
    print("=" * 60 + "\n")
    
    try:
        os.system("python -m g4f.api")
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()
