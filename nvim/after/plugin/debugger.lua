local dap = require("dap")
local dapui = require('dapui')

require('nvim-dap-virtual-text')

dap.adapters.dart = {
  type = "executable",
  command = "dart",
  args = {"debug_adapter"}
  -- add dart test adapter with arg '--test' see:
  -- https://github.com/dart-lang/sdk/blob/main/pkg/dds/tool/dap/README.md
}

dap.configurations.dart = {
  {
    type = "dart",
    request = "launch",
    name = "Launch Dart Program",
    -- The nvim-dap plugin populates this variable with the filename of the current buffer
    program = "${file}",
    -- The nvim-dap plugin populates this variable with the editor's current working directory
		-- dartSdkPath = "~/.fvm/default/bin/cache/dart-sdk/",
		-- flutterSdkPath = "~/.fvm/default",
    cwd = "${workspaceFolder}",
    args = {"--help"}, -- Note for Dart apps this is args, for Flutter apps toolArgs
  }
}

dapui.setup()

dap.listeners.after.event_initialized["dapui_config"] = function()
  dapui.open()
end

dap.listeners.before.event_terminated["dapui_config"] = function()
  -- dapui.close()
  -- dont do anything, so that we can see any crash errors in the console
end

dap.listeners.before.event_exited["dapui_config"] = function()
  -- dapui.close()
  -- dont do anything, so that we can see any crash errors in the console
end
