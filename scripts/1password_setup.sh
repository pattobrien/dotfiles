#!/bin/bash

# Script to set up a new SSH key for 1Password
# Requirements: 1Password CLI (op) installed and authenticated

# Set default values
KEY_TYPE="ed25519"
DEFAULT_KEY_NAME="id_${KEY_TYPE}_$(hostname)"
SSH_DIR="$HOME/.ssh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

# Check if 1Password CLI is installed
if ! command -v op &> /dev/null; then
    print_error "1Password CLI (op) is not installed. Please install it first."
    exit 1
fi

# Check if user is signed in to 1Password CLI
if ! op account get &> /dev/null; then
    print_error "Please sign in to 1Password CLI first using 'op signin'"
    exit 1
fi

# Create .ssh directory if it doesn't exist
if [ ! -d "$SSH_DIR" ]; then
    print_status "Creating SSH directory..."
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
fi

# Get key name from user or use default
read -p "Enter key name [$DEFAULT_KEY_NAME]: " KEY_NAME
KEY_NAME=${KEY_NAME:-$DEFAULT_KEY_NAME}

# Get key comment from user
read -p "Enter key comment (e.g., 'personal@macbook'): " KEY_COMMENT

# Generate the SSH key
print_status "Generating SSH key..."
ssh-keygen -t "$KEY_TYPE" -C "$KEY_COMMENT" -f "$SSH_DIR/$KEY_NAME"

if [ $? -ne 0 ]; then
    print_error "Failed to generate SSH key"
    exit 1
fi

# Add key to SSH agent
print_status "Starting SSH agent..."
eval "$(ssh-agent -s)"

print_status "Adding key to SSH agent..."
ssh-add "$SSH_DIR/$KEY_NAME"

# Store the private key in 1Password
print_status "Storing private key in 1Password..."
op document create "$SSH_DIR/$KEY_NAME" --title="SSH Key: $KEY_NAME" --tags="ssh,key" &> /dev/null

if [ $? -eq 0 ]; then
    print_success "Private key stored in 1Password successfully"
else
    print_error "Failed to store private key in 1Password"
fi

# Display public key
print_success "SSH key setup complete!"
echo -e "\nYour public key is:"
echo "----------------"
cat "$SSH_DIR/$KEY_NAME.pub"
echo "----------------"
print_status "Add this public key to your remote services (GitHub, servers, etc.)"

# Cleanup
print_status "Cleaning up..."
rm -f "$SSH_DIR/$KEY_NAME" # Remove local private key after storing in 1Password

print_success "Setup complete! Your private key is now stored securely in 1Password."
echo "To use this key on another device, retrieve it from 1Password and place it in ~/.ssh/"