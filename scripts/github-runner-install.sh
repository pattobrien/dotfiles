# Sources:
# 1. https://docs.github.com/en/actions/hosting-your-own-runners/adding-self-hosted-runners
# 2. https://docs.github.com/en/actions/hosting-your-own-runners/configuring-the-self-hosted-runner-application-as-a-service?learn=hosting_your_own_runners

# Create a folder
mkdir actions-runner && cd actions-runner
# Download the latest runner package
curl -o actions-runner-osx-x64-2.283.2.tar.gz -L https://github.com/actions/runner/releases/download/v2.283.2/actions-runner-osx-x64-2.283.2.tar.gz
# Optional: Validate the hash
echo "d7d026b9bf1cb3f133cf53e79c71c0458a82b3f2bdb0a8859cd386ae18ee7c4a  actions-runner-osx-x64-2.283.2.tar.gz" | shasum -a 256 -c
# Extract the installer
tar xzf ./actions-runner-osx-x64-2.283.2.tar.gz

# Create the runner and start the configuration experience
./config.sh --url https://github.com/pattobrien/hub-api --token AC7FPTU37QXFXCKO4BDFGBTBNO4AY

# install the runner as a service
./svc.sh install
# Start the service with the following command:
./svc.sh start
# Check the status of the service with the following command:
./svc.sh status