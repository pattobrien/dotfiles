if vim.g.vscode then
    return
end

local flutter_tools = require('flutter-tools')
local custom_config = require('pattobrien.lsp')


-- local lsp_config = require('lspconfig')
--
-- lsp_config["dartls"].setup({
--     capabilities = custom_config.capabilities,
--     on_attach = custom_config.on_attach,
--     cmd = {
--         "dart",
--         "language-server",
--         "--protocol=lsp",
--         -- "--port=8123",
--         -- "--instrumentation-log-file=/Users/robertbrunhage/Desktop/lsp-log.txt",
--     },
--     filetypes = { "dart" },
--     init_options = {
--         onlyAnalyzeProjectsWithOpenFiles = false,
--         suggestFromUnimportedLibraries = true,
--         closingLabels = true,
--         outline = false,
--         flutterOutline = false,
--     },
--     settings = {
--         dart = {
--             analysisExcludedFolders = {
--                 vim.fn.expand("$HOME/AppData/Local/Pub/Cache"),
--                 vim.fn.expand("$HOME/.pub-cache"),
--                 vim.fn.expand("/opt/homebrew/"),
--                 vim.fn.expand("$HOME/tools/flutter/"),
--             },
--             updateImportsOnRename = true,
--             completeFunctionCalls = true,
--             showTodos = true,
--         },
--     },
-- })
--

flutter_tools.setup {
    ui = {
        -- the border type to use for all floating windows, the same options/formats
        -- used for ":h nvim_open_win" e.g. "single" | "shadow" | {<table-of-eight-chars>}
        border = "rounded",
        -- This determines whether notifications are show with `vim.notify` or with the plugin's custom UI
        -- please note that this option is eventually going to be deprecated and users will need to
        -- depend on plugins like `nvim-notify` instead.
        -- notification_style = 'plugin',
        notification_style = 'native',
    },
    decorations = {
        statusline = {
            -- set to true to be able use the 'flutter_tools_decorations.app_version' in your statusline
            -- this will show the current version of the flutter app from the pubspec.yaml file
            app_version = true,
            -- set to true to be able use the 'flutter_tools_decorations.device' in your statusline
            -- this will show the currently running device if an application was started with a specific
            -- device
            device = true,

            project_config = true,
        }
    },
    debugger = {
        -- integrate with nvim dap + install dart code debugger
        enabled = false,
        run_via_dap = true, -- use dap instead of a plenary job to run flutter apps
        -- -- if empty dap will not stop on any exceptions, otherwise it will stop on those specified
        -- -- see |:help dap.set_exception_breakpoints()| for more info
        exception_breakpoints = {},
        -- register_configurations = function(paths)
        --     require("dap").configurations.dart = {
        -- --         <put here config that you would find in .vscode/launch.json>
        --       }
        --     end,
    },
    -- flutter_path = "/Users/pattobrien/.fvm/default/bin/flutter",-- <-- this takes priority over the lookup
    -- flutter_lookup_cmd = nil, -- example "dirname $(which flutter)" or "asdf where flutter"
    fvm = false, -- takes priority over path, uses <workspace>/.fvm/flutter_sdk if enabled
    widget_guides = {
        enabled = true,
    },
    closing_tags = {
        -- highlight = "ErrorMsg", -- highlight for the closing tag
        prefix = "// ", -- character to use for close tag e.g. > Widget
        enabled = true  -- set to false to disable
    },
    dev_log = {
        enabled = false,
        open_cmd = "tabedit", -- command to use to open the log buffer
    },
    dev_tools = {
        autostart = false,         -- autostart devtools server if not detected
        auto_open_browser = false, -- Automatically opens devtools in the browser
    },
    outline = {
        open_cmd = "30vnew", -- command to use to open the outline buffer
        auto_open = false    -- if true this will open the outline automatically when it is first populated
    },
    lsp = {
        color = {
            -- show the derived colours for dart variables
            enabled = true, -- whether or not to highlight color variables at all, only supported on flutter >= 2.10
            background = false, -- highlight the background
            background_color = nil, -- required, when background is transparent (i.e. background_color = { r = 19, g = 17, b = 24},)
            foreground = false, -- highlight the foreground
            virtual_text = true, -- show the highlight using virtual text
            virtual_text_str = "■", -- the virtual text character to highlight
        },

        on_attach = custom_config.on_attach,
        capabilities = custom_config.capabilities,
        -- flags = custom_config.flags,
        -- handlers = custom_config.handlers,
        -- see the link below for details on each option:
        -- https://github.com/dart-lang/sdk/blob/master/pkg/analysis_server/tool/lsp_spec/readme.md#client-workspace-configuration
        settings = {
            showtodos = true,
            completefunctioncalls = true,
            -- analysisexcludedfolders = {},
            -- analysisexcludedfolders = {"<path-to-flutter-sdk-packages>"},
            includedependenciesinworkspacesymbols = true,
            renamefileswithclasses = "prompt", -- "always"
            enablesnippets = true,
            updateimportsonrename = true,      -- whether to update imports on rename
        }
    }
}

vim.keymap.set('n', '<leader>fl', ':Telescope flutter commands<cr>')
