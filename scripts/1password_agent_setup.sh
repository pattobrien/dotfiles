#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

SSH_CONFIG="$HOME/.ssh/config"
SSH_DIR="$HOME/.ssh"

# Create .ssh directory if it doesn't exist
if [ ! -d "$SSH_DIR" ]; then
    print_status "Creating SSH directory..."
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
fi

# Check if config file exists, create if it doesn't
if [ ! -f "$SSH_CONFIG" ]; then
    print_status "Creating SSH config file..."
    touch "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
fi

# Check if 1Password SSH agent configuration already exists
if grep -q "Host \*" "$SSH_CONFIG" && grep -q "IdentityAgent" "$SSH_CONFIG"; then
    print_status "1Password SSH agent configuration already exists in SSH config"
else
    print_status "Adding 1Password SSH agent configuration..."
    # Add configuration to the top of the file
    TMP_FILE=$(mktemp)
    cat > "$TMP_FILE" << 'EOF'

# 1Password SSH agent configuration
Host *
    IdentityAgent "~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"

EOF
    cat "$SSH_CONFIG" >> "$TMP_FILE"
    mv "$TMP_FILE" "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
    print_success "1Password SSH agent configuration added"
fi

# Verify 1Password CLI installation and agent status
if ! command -v op &> /dev/null; then
    print_error "1Password CLI (op) is not installed. Please install it first."
    exit 1
fi

print_status "Checking 1Password SSH agent status..."
if op ssh ls &> /dev/null; then
    print_success "1Password SSH agent is working correctly"
else
    print_error "Please make sure you're signed in to 1Password CLI:"
    echo -e "${GREEN}eval \$(op signin)${NC}"
fi

print_success "Setup complete! Your SSH config has been updated to use 1Password SSH agent."
echo "You can now add SSH keys to 1Password and they will be automatically available to SSH."