#!/usr/bin/env python3
"""
Simple script to test Firebase authentication functionality
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_auth():
    print("🔥 Testing Firebase Authentication")
    print("=" * 50)

    # Test 1: Health check
    print("\n1. Testing auth health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/auth/health")
        if response.status_code == 200:
            print("✓ Auth health check passed")
            print(f"  Response: {response.json()}")
        else:
            print(f"✗ Auth health check failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Auth health check error: {e}")

    # Test 2: Firebase config endpoint
    print("\n2. Testing Firebase config endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/auth/config")
        if response.status_code == 200:
            print("✓ Firebase config retrieved successfully")
            config = response.json()
            firebase_config = config.get("firebase_config", {})
            print(f"  Project ID: {firebase_config.get('projectId')}")
            print(f"  Auth Domain: {firebase_config.get('authDomain')}")
        else:
            print(f"✗ Firebase config failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Firebase config error: {e}")

    # Test 3: User registration
    print("\n3. Testing user registration...")
    test_user = {
        "email": f"test_{int(time.time())}@example.com",
        "password": "TestPassword123!",
        "display_name": "Test User"
    }

    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            headers={"Content-Type": "application/json"},
            json=test_user
        )
        if response.status_code == 200:
            print("✓ User registration successful")
            user_data = response.json()
            print(f"  User ID: {user_data['user']['uid']}")
            print(f"  Email: {user_data['user']['email']}")
            print(f"  Display Name: {user_data['user']['display_name']}")
        else:
            print(f"✗ User registration failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ User registration error: {e}")

    # Test 4: Login endpoint (should return Firebase config)
    print("\n4. Testing login endpoint...")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            }
        )
        if response.status_code == 200:
            print("✓ Login endpoint working")
            login_data = response.json()
            print(f"  Message: {login_data['message']}")
            print(f"  Firebase config provided: {'firebase_config' in login_data}")
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Login error: {e}")

    print("\n" + "=" * 50)
    print("🔥 Firebase Authentication Test Complete")

if __name__ == "__main__":
    test_auth()