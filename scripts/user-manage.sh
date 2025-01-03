#!/bin/bash

# Load environment variables
source .env.node

# Base URL for API calls
API_URL="http://localhost:3000/app2"

# Function to handle login
login() {
    local email="$1"
    local password="$2"
    
    echo "Logging in user..."
    ./scripts/api-call.sh POST /app2/users/login "{\"email\":\"$email\",\"password\":\"$password\"}"
}

# Function to register new user
register() {
    local email="$1"
    local password="$2"
    local name="$3"
    local role="${4:-operator}"  # Default role is operator
    
    echo "Registering new user..."
    ./scripts/api-call.sh POST /app2/users/register "{\"email\":\"$email\",\"password\":\"$password\",\"passwordConfirm\":\"$password\",\"name\":\"$name\",\"role\":\"$role\"}"
}

# Function to create user (admin only)
create_user() {
    local email="$1"
    local password="$2"
    local name="$3"
    local role="${4:-operator}"  # Default role is operator
    local token="$5"
    
    echo "Creating new user..."
    ./scripts/api-call.sh POST /app2/users "{\"email\":\"$email\",\"password\":\"$password\",\"passwordConfirm\":\"$password\",\"name\":\"$name\",\"role\":\"$role\"}" "$token"
}

# Function to update user
update_user() {
    local user_id="$1"
    local data="$2"
    local token="$3"
    
    echo "Updating user..."
    ./scripts/api-call.sh PATCH "/app2/users/$user_id" "$data" "$token"
}

# Function to delete user
delete_user() {
    local user_id="$1"
    local token="$2"
    
    echo "Deleting user..."
    ./scripts/api-call.sh DELETE "/app2/users/$user_id" "" "$token"
}

# Function to show usage
show_usage() {
    echo "Usage:"
    echo "  $0 login <email> <password>"
    echo "  $0 register <email> <password> <name> [role]"
    echo "  $0 create <email> <password> <name> [role] <token>"
    echo "  $0 update <user_id> <json_data> <token>"
    echo "  $0 delete <user_id> <token>"
}

# Main script logic
case "$1" in
    "login")
        if [ $# -lt 3 ]; then
            echo "Error: Missing parameters for login"
            show_usage
            exit 1
        fi
        login "$2" "$3"
        ;;
    "register")
        if [ $# -lt 4 ]; then
            echo "Error: Missing parameters for register"
            show_usage
            exit 1
        fi
        register "$2" "$3" "$4" "$5"
        ;;
    "create")
        if [ $# -lt 5 ]; then
            echo "Error: Missing parameters for create"
            show_usage
            exit 1
        fi
        create_user "$2" "$3" "$4" "$5" "$6"
        ;;
    "update")
        if [ $# -lt 4 ]; then
            echo "Error: Missing parameters for update"
            show_usage
            exit 1
        fi
        update_user "$2" "$3" "$4"
        ;;
    "delete")
        if [ $# -lt 3 ]; then
            echo "Error: Missing parameters for delete"
            show_usage
            exit 1
        fi
        delete_user "$2" "$3"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac 