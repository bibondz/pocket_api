#!/bin/bash

# Configuration
BASE_URL="https://api.irissar.com"  # Base URL for both PocketBase and our service
TOKEN_FILE=".token"
CREDENTIALS_FILE=".env.node"

# Load credentials from .env.node
if [ -f "$CREDENTIALS_FILE" ]; then
    # Only export lines that are valid environment variable declarations
    export $(grep -E '^[A-Z_]+=' "$CREDENTIALS_FILE" | xargs)
fi

# Function to get new token
get_new_token() {
    local role=$1
    
    # Choose credentials based on role
    local email="${TEST_EMAIL}"  # Default admin
    local password="${TEST_PASSWORD}"
    
    case "$role" in
        "manager")
            email="tank.manager@irissar.com"
            password="Manager@123"
            ;;
        "operator")
            email="tank.operator@irissar.com"
            password="Operator@123"
            ;;
        "admin")
            email="supervisor.admin@irissar.com"
            password="Supervisor@123"
            ;;
    esac
    
    response=$(curl -s -X POST "${BASE_URL}/app2/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"identity\": \"${email}\",
            \"password\": \"${password}\"
        }")
    
    token=$(echo $response | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
    if [ ! -z "$token" ]; then
        echo $token > "$TOKEN_FILE"
        return 0
    else
        echo "Failed to get new token" >&2
        echo $response >&2
        return 1
    fi
}

# Function to make API call
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local role="admin"  # Default role
    
    # Check if role parameter is present
    if [ ! -z "$4" ]; then
        role="$4"
    fi
    
    # Get token (either from file or new one)
    local token=""
    if [ -f "$TOKEN_FILE" ]; then
        token=$(cat "$TOKEN_FILE")
    fi
    
    if [ -z "$token" ]; then
        echo "Getting new token..." >&2
        if ! get_new_token $role; then
            return 1
        fi
        token=$(cat "$TOKEN_FILE")
    fi
    
    # Convert /api/* to /app2/* for our service endpoints, but not for collections
    if [[ "$endpoint" == *"/collections/"* ]]; then
        local url_endpoint="$endpoint"
    else
        local url_endpoint="${endpoint/\/api\//\/app2\/}"
    fi
    
    # Make the API call
    if [ -z "$data" ]; then
        response=$(curl -s -X $method \
            -H "Authorization: Bearer ${token}" \
            -v \
            "${BASE_URL}${url_endpoint}")
    else
        response=$(curl -s -X $method \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json" \
            -v \
            -d "$data" \
            "${BASE_URL}${url_endpoint}")
    fi
    
    # Check if token expired
    if echo "$response" | grep -q "TOKEN_EXPIRED\|INVALID_TOKEN"; then
        echo "Token expired, getting new token..."
        token=$(get_new_token $role)
        
        # Retry the API call with new token
        if [ -z "$data" ]; then
            response=$(curl -s -X $method \
                -H "Authorization: Bearer $token" \
                "${BASE_URL}${url_endpoint}")
        else
            response=$(curl -s -X $method \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "${BASE_URL}${url_endpoint}")
        fi
    fi
    
    echo "$response"
}

# Check if command line arguments are provided
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 METHOD ENDPOINT [DATA] [ROLE]"
    echo "Example: $0 GET /api/tanks"
    echo "Example: $0 POST /api/tanks '{\"name\":\"Test Tank\"}'"
    echo "Example: $0 GET /api/tanks '' manager"
    echo "Example: $0 GET /api/tanks '' operator"
    exit 1
fi

# Make the API call with provided arguments
make_api_call "$1" "$2" "$3" "$4" 