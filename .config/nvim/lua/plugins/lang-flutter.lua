-- TODO: This Flutter/Dart config was carried forward from the pre-LazyVim setup
-- and was NOT updated during the LazyVim / Neovim v0.12 migration.
-- Review flutter-tools.nvim and DAP config for compatibility.

return {
  -- flutter-tools.nvim — Flutter run/reload/restart, Dart LSP, widget guides
  {
    "nvim-flutter/flutter-tools.nvim",
    ft = "dart",
    dependencies = {
      "nvim-lua/plenary.nvim",
    },
    opts = {
      ui = {
        border = "rounded",
        notification_style = "native",
      },
      decorations = {
        statusline = {
          app_version = true,
          device = true,
          project_config = true,
        },
      },
      debugger = {
        enabled = false,
        run_via_dap = true,
        exception_breakpoints = {},
      },
      fvm = false,
      widget_guides = { enabled = true },
      closing_tags = {
        prefix = "// ",
        enabled = true,
      },
      dev_log = {
        enabled = false,
        open_cmd = "tabedit",
      },
      dev_tools = {
        autostart = false,
        auto_open_browser = false,
      },
      outline = {
        open_cmd = "30vnew",
        auto_open = false,
      },
      lsp = {
        color = {
          enabled = true,
          background = false,
          foreground = false,
          virtual_text = true,
          virtual_text_str = "|",
        },
        settings = {
          showtodos = true,
          completefunctioncalls = true,
          includedependenciesinworkspacesymbols = true,
          renamefileswithclasses = "prompt",
          enablesnippets = true,
          updateimportsonrename = true,
        },
      },
    },
    keys = {
      -- TODO: This used Telescope before migration. flutter-tools registers
      -- :Flutter* commands directly — use those or find an fzf-lua equivalent.
      { "<leader>fl", "<cmd>FlutterDevices<cr>", desc = "Flutter Devices" },
      { "<leader>fa", "<cmd>FlutterRun<cr>", desc = "Flutter Run" },
      { "<leader>fq", "<cmd>FlutterQuit<cr>", desc = "Flutter Quit" },
      { "<leader>fr", "<cmd>FlutterReload<cr>", desc = "Flutter Reload" },
      { "<leader>fR", "<cmd>FlutterRestart<cr>", desc = "Flutter Restart" },
      { "<leader>fD", "<cmd>FlutterVisualDebug<cr>", desc = "Flutter Visual Debug" },
      { "<leader>fs", "<cmd>FlutterLspRestart<cr>", desc = "Flutter LSP Restart" },
    },
  },

  -- Dart DAP (debug adapter) configuration
  {
    "mfussenegger/nvim-dap",
    optional = true,
    opts = function()
      local dap = require("dap")

      dap.adapters.dart = {
        type = "executable",
        command = "dart",
        args = { "debug_adapter" },
      }

      dap.configurations.dart = {
        {
          type = "dart",
          request = "launch",
          name = "Launch Dart Program",
          program = "${file}",
          cwd = "${workspaceFolder}",
          args = { "--help" },
        },
      }
    end,
  },

  -- Treesitter parser for Dart
  {
    "nvim-treesitter/nvim-treesitter",
    opts = function(_, opts)
      opts.ensure_installed = opts.ensure_installed or {}
      vim.list_extend(opts.ensure_installed, { "dart" })
    end,
  },
}
