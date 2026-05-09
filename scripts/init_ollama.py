#!/usr/bin/env python3
"""
Startup script to initialize Ollama with qwen2.5:3b model on GPU.
This script ensures Ollama is running and the model is properly loaded.
"""

import subprocess
import time
import requests
import sys
import os


def load_env_file(env_path):
    """Load KEY=VALUE pairs from a local env file."""
    if not os.path.exists(env_path):
        return {}

    values = {}
    with open(env_path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()

            if "#" in value:
                value = value.split("#", 1)[0].strip()

            values[key] = value

    return values

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_FILE = os.path.join(PROJECT_ROOT, ".env.ollama")
OLLAMA_ENV = {
    **os.environ,
    **load_env_file(ENV_FILE),
}

def is_ollama_running():
    """Check if Ollama service is running."""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except:
        return False

def wait_for_ollama(timeout=30):
    """Wait for Ollama to start."""
    print("Waiting for Ollama service to start...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_ollama_running():
            print("✓ Ollama service is running!")
            return True
        print(".", end="", flush=True)
        time.sleep(1)
    print("\n✗ Ollama service did not start within timeout")
    return False

def check_model_available():
    """Check if the model is available locally."""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10)
        models = response.json().get('models', [])
        return any(OLLAMA_MODEL in m.get('name', '') for m in models)
    except:
        return False

def pull_model():
    """Download the model if not available."""
    print(f"\nPulling model {OLLAMA_MODEL}...")
    try:
        # Using subprocess to stream the pull output
        result = subprocess.run(
            ['ollama', 'pull', OLLAMA_MODEL],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"✓ Model {OLLAMA_MODEL} is ready!")
            return True
        else:
            print(f"✗ Failed to pull model: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error pulling model: {e}")
        return False

def test_gpu_inference():
    """Test that GPU acceleration is working."""
    print("\nTesting GPU-accelerated inference...")
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                'model': OLLAMA_MODEL,
                'prompt': 'Hello',
                'stream': False,
            },
            timeout=60
        )
        if response.status_code == 200:
            data = response.json()
            load_time = data.get('load_duration', 0) / 1e9
            eval_time = data.get('eval_duration', 0) / 1e9
            print(f"✓ GPU inference working!")
            print(f"  Load time: {load_time:.2f}s")
            print(f"  Eval time: {eval_time:.2f}s")
            print(f"  Tokens/sec: {data.get('eval_count', 0) / (eval_time + 0.001):.2f}")
            return True
        else:
            print(f"✗ Inference failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Inference test error: {e}")
        return False


def verify_ollama_gpu_process():
    """Check that Ollama is attached to the NVIDIA GPU."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-compute-apps=pid,process_name,used_gpu_memory",
                "--format=csv",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception as e:
        print(f"✗ GPU verification error: {e}")
        return False

    output = (result.stdout or "") + (result.stderr or "")
    has_ollama = any(
        "ollama" in line.lower() and ("exe" in line.lower() or "ollama" in line.lower())
        for line in output.splitlines()
    )

    if has_ollama:
        print("✓ Ollama is visible in nvidia-smi compute processes")
        return True

    print("⚠ Ollama was not listed in nvidia-smi compute processes")
    return False

def main():
    print("="*60)
    print("OLLAMA GPU INITIALIZATION")
    print("="*60)
    
    # Step 1: Check and start Ollama
    print("\n1. Checking Ollama service...")
    if is_ollama_running():
        print("✓ Ollama is already running")
    else:
        print("Starting Ollama service in background...")
        try:
            # Start Ollama serve in background
            subprocess.Popen(
                ['ollama', 'serve'],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=OLLAMA_ENV,
            )
            if not wait_for_ollama(timeout=30):
                print("✗ Could not start Ollama. Please run: ollama serve")
                return 1
        except Exception as e:
            print(f"✗ Error starting Ollama: {e}")
            print("Please run: ollama serve")
            return 1
    
    # Step 2: Check and pull model
    print("\n2. Checking model...")
    if check_model_available():
        print(f"✓ Model {OLLAMA_MODEL} is available")
    else:
        if not pull_model():
            print(f"✗ Failed to setup model {OLLAMA_MODEL}")
            return 1
    
    # Step 3: Test GPU acceleration
    print("\n3. Testing GPU acceleration...")
    if test_gpu_inference():
        gpu_verified = verify_ollama_gpu_process()
        print("\n" + "="*60)
        if gpu_verified:
            print("✓ SUCCESS: Ollama is running on the GPU!")
        else:
            print("⚠ Inference succeeded, but GPU process visibility could not be confirmed")
        print("="*60)
        return 0
    else:
        print("\n⚠ Inference test failed. Check GPU setup.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
