#!/bin/bash

# Ensure the 1Password CLI has an account and an active session.
#
# The "Integrate with 1Password CLI" toggle and the initial account sign-in are
# gated behind the desktop app's GUI + system auth by design — you can't flip
# them from a script (otherwise malware could too). So this step can't be fully
# automated. Instead it detects whether the CLI already has an account and, if
# not, guides you through the one manual action and pauses until it's done.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
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

# Check if 1Password CLI is installed
if ! command -v op &> /dev/null; then
    print_error "1Password CLI (op) is not installed. Run the 'essentials' step first."
    exit 1
fi

# Keep the op config directory private (no-op if it doesn't exist yet)
[ -d "$HOME/.config/op" ] && chmod 700 "$HOME/.config/op"

print_status "Checking for a 1Password account configured for the CLI..."

if ! op account list 2>/dev/null | grep -q .; then
    print_error "No 1Password account is available to the CLI yet."
    echo
    echo "  This can't be scripted — 1Password gates it behind the desktop app."
    echo "  Enable it once, manually:"
    echo
    echo -e "    1. Open the ${YELLOW}1Password${NC} desktop app and sign in to your account."
    echo -e "    2. ${YELLOW}Settings (Cmd+,) -> Developer${NC}, then enable:"
    echo -e "         - ${YELLOW}Integrate with 1Password CLI${NC}"
    echo -e "         - ${YELLOW}Use the SSH agent${NC}"
    echo

    # The dotbot shell step runs with stdin attached, so we can pause here.
    while true; do
        printf "Press Enter once CLI integration is enabled (or type 's' to skip): "
        read -r reply
        if [ "$reply" = "s" ] || [ "$reply" = "S" ]; then
            print_status "Skipping for now — re-run this step once integration is on."
            exit 0
        fi
        if op account list 2>/dev/null | grep -q .; then
            break
        fi
        print_error "Still no account visible to the CLI. Double-check the toggle, then try again."
    done
fi

print_success "1Password account detected for the CLI."

# Establish a session. With desktop integration this is approved via the app
# (Touch ID / app prompt), not a typed master password.
print_status "Signing in to 1Password CLI..."
if eval "$(op signin)" 2>/dev/null && op account get &> /dev/null; then
    print_success "Signed in to 1Password CLI."
else
    print_error "Couldn't start a session automatically. Approve the desktop prompt and run:"
    echo -e "    ${GREEN}eval \$(op signin)${NC}"
fi
