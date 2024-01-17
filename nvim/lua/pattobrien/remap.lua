vim.g.mapleader = " "

-- general strategy for keymaps
-- leader:
-- - l - LSP
-- - f - Flutter / Dart
-- - d - Debugger
-- -

-- easily go back to normal mode
vim.keymap.set("i", "jk", "<ESC>")
vim.keymap.set("i", "jj", "<ESC>")

-- easily go to explorer
vim.keymap.set("n", "<leader>pv", vim.cmd.Ex)

-- highlight text and move up / down
vim.keymap.set("v", "J", ":m '>+1<CR>gv=gv")
vim.keymap.set("v", "K", ":m '<-2<CR>gv=gv")

-- cursor stays in center of view when moving up/down page
vim.keymap.set("n", "<C-d>", "<C-d>zz")
vim.keymap.set("n", "<C-u>", "<C-u>zz")
vim.keymap.set("n", "n", "nzzzv")
vim.keymap.set("n", "N", "Nzzzv")

-- deletion goes to void buffer instead of normal buffer
vim.keymap.set("x", "<leader>p", "\"_dp")

-- start a new tmux session from sessionizer (TODO: fix this)
vim.keymap.set("n", "<C-f>", "<cmd>silent !tmux neww tmux-sessionizer<CR>")

-- navigation within quick fixes
-- vim.keymap.set("n", "<C-k>", "<cmd>cnext<CR>zz")
-- vim.keymap.set("n", "<C-j>", "<cmd>cprev<CR>zz")
vim.keymap.set("n", "<leader>k", "<cmd>lnext<CR>zz")
vim.keymap.set("n", "<leader>j", "<cmd>lprev<CR>zz")


-- re-source lua files
vim.keymap.set("n", "<leader>sf", ":source %<CR>")    -- from current file
vim.keymap.set('n', '<leader>sv', ':so $MYVIMRC<cr>') -- entire nvim config


-- debugger
if vim.g.vscode then 
    local vscode = require('vscode-neovim')
    -- toggle breakpoint
    vim.keymap.set("n", "<leader>db", function()
        vscode.action("editor.debug.action.toggleBreakpoint")
    end)
    -- continue
    vim.keymap.set("n", "<leader>dc", function()
        vscode.action("workbench.action.debug.continue")
    end)

    -- start debugging
    vim.keymap.set("n", "<leader>dd", function()
        vscode.action("workbench.action.debug.start")
    end)

    -- restart debugger
    vim.keymap.set("n", "<leader>dr", function()
        vscode.action("workbench.action.debug.restart")
    end)

    -- stop debugging
    vim.keymap.set("n", "<leader>dq", function()
        vscode.action("workbench.action.debug.stop")
    end)

    -- step over
    -- using `n` because its the same key as `next` in vim, which might
    -- make intuitive sense, 
    vim.keymap.set("n", "<leader>dn", function()
        vscode.action("workbench.action.debug.stepOver")
    end)

    -- step into
    vim.keymap.set("n", "<leader>dj", function()
        vscode.action("workbench.action.debug.stepInto")
    end)

    -- step out
    vim.keymap.set("n", "<leader>dk", function()
        vscode.action("workbench.action.debug.stepOut")
    end)

    -- rename
    vim.keymap.set("n", "<leader>rn", function()
        vscode.action("editor.action.rename")
    end)
    vim.keymap.set("v", "<leader>rn", function()
        vscode.action("editor.action.rename")
    end)
end
if vim.g.vscode == nil then
    -- nvim-tree
    vim.keymap.set("n", "<leader>e", ":NvimTreeToggle<CR>")

    local dap = require('dap')
    local dapui = require('dapui')

    vim.keymap.set('n', '<leader>ds', dap.continue)
    vim.keymap.set('n', '<F10>', dap.step_over)
    vim.keymap.set('n', '<F11>', dap.step_into)
    vim.keymap.set('n', '<F12>', dap.step_out)
    vim.keymap.set('n', '<Leader>b', dap.toggle_breakpoint)
    vim.keymap.set('n', '<Leader>B', dap.set_breakpoint)
    vim.keymap.set('n', '<Leader>lp', function() dap.set_breakpoint(nil, nil, vim.fn.input('Log point message: ')) end)
    vim.keymap.set('n', '<Leader>dr', dap.repl.open)
    vim.keymap.set('n', '<Leader>dl', dap.run_last)
    vim.keymap.set('n', '<leader>dq', dapui.toggle)

    -- chatgpt / copilot
    vim.keymap.set('n', '<leader>cc', ':ChatGPT<CR>')
    vim.keymap.set('n', '<leader>ce', ':Copilot enable<CR>')
    vim.keymap.set('n', '<leader>cd', ':Copilot disable<CR>')

    -- vim.keymap.set({'n', 'v'}, '<Leader>dh', function()
    --   require('dap.ui.widgets').hover()
    -- end)
    -- vim.keymap.set({'n', 'v'}, '<Leader>dp', function()
    --   require('dap.ui.widgets').preview()
    -- end)
    -- vim.keymap.set('n', '<Leader>df', function()
    --   local widgets = require('dap.ui.widgets')
    --   widgets.centered_float(widgets.frames)
    -- end)
    -- vim.keymap.set('n', '<Leader>ds', function()
    --   local widgets = require('dap.ui.widgets')
    --   widgets.centered_float(widgets.scopes)
    -- end)

    -- flutter specific
    vim.keymap.set("n", "<leader>fa", ":FlutterRun<CR>")
    vim.keymap.set("n", "<leader>fq", ":FlutterQuit<CR>")
    vim.keymap.set("n", "<leader>fr", ":FlutterReload<CR>")
    vim.keymap.set("n", "<leader>fR", ":FlutterRestart<CR>")
    vim.keymap.set("n", "<leader>fD", ":FlutterVisualDebug<CR>")
    vim.keymap.set("n", "<leader>fs", ":FlutterLspRestart<CR>")
    -- TODO:
    -- FlutterLspRestart for restarting analysis server
    -- FlutterReanalyze - Forces LSP server reanalyze using custom LSP method dart/reanalyze.

    -- Map this function to a key combination.
    -- vim.keymap.set('n', '<leader>br', function()
    --     require('telescope').extensions.flutter_build_runner.my_picker()
    --   end,
    --   { noremap = true, silent = true })

    -- Assuming you're using a `init.lua` file

    local myplugin = require('pattobrien.flutter-build-runner')

    -- Then you can map your plugin function to a key

    vim.keymap.set('n', '<leader>h',
        function()
            myplugin.my_picker()
        end,
        { noremap = true, silent = true, })




    -- Setup autocmd to run each time the buffer is entered
    vim.cmd([[
    augroup Statusline
      autocmd!
      autocmd BufEnter * lua UpdateStatusline()
    augroup END
  ]])

    function UpdateStatusline()
        -- Check if the buffer is modified
        -- local is_modified = vim.api.nvim_buf_get_option(0, 'modified')
        -- print('hello there')
        local is_modified = true

        -- Define color and icon based on the condition
        local color, icon
        if is_modified then
            color = '%#DiffAdd#' -- Use DiffAdd highlight group, you can define your own
            icon = '💾' -- Use an icon for modified buffer
        else
            color = '%#Normal#' -- Use Normal highlight group
            icon = '✔' -- Use a different icon for unmodified buffer
        end

        -- Apply to statusline
        local statusline = string.format('%s %s %%f', color, icon)
        vim.api.nvim_set_option('statusline', statusline)
    end

    -- print('hello')
    UpdateStatusline()

    -- M.my_picker()
end
