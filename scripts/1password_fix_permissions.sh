#!/bin/bash

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

# Fix 1Password config directory permissions
OP_CONFIG_DIR="$HOME/.config/op"

if [ -d "$OP_CONFIG_DIR" ]; then
    print_status "Fixing 1Password config directory permissions..."
    chmod 700 "$OP_CONFIG_DIR"
    
    if [ $? -eq 0 ]; then
        print_success "Successfully updated permissions for $OP_CONFIG_DIR"
    else
        print_error "Failed to update permissions for $OP_CONFIG_DIR"
        exit 1
    fi
else
    print_status "Creating 1Password config directory with correct permissions..."
    mkdir -p "$OP_CONFIG_DIR"
    chmod 700 "$OP_CONFIG_DIR"
fi

# Verify permissions
PERMS=$(stat -f "%Lp" "$OP_CONFIG_DIR")
if [ "$PERMS" != "700" ]; then
    print_error "Failed to set correct permissions. Current permissions: $PERMS"
    exit 1
fi

print_success "1Password directory permissions have been fixed!"
print_status "You can now proceed with the SSH key setup script"