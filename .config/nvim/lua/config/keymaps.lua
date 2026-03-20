-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua

-- NOTE: LazyVim already provides:
--   <A-j>/<A-k> to move lines (normal + visual)
--   <leader>e for file explorer
--   <Esc> to clear search highlights
--   ]d/[d for diagnostic navigation
--   <C-h/j/k/l> for window navigation
--   <S-h>/<S-l> for buffer navigation

-- highlight text and move up / down (also keeping LazyVim's <A-j>/<A-k>)
vim.keymap.set("v", "J", ":m '>+1<CR>gv=gv")
vim.keymap.set("v", "K", ":m '<-2<CR>gv=gv")

-- cursor stays in center of view when moving up/down page
vim.keymap.set("n", "<C-d>", "<C-d>zz")
vim.keymap.set("n", "<C-u>", "<C-u>zz")

-- centered search navigation — disabled, trying LazyVim defaults
-- vim.keymap.set("n", "n", "nzzzv")
-- vim.keymap.set("n", "N", "Nzzzv")

-- paste over selection without yanking the replaced text
vim.keymap.set("x", "<leader>p", '"_dP')

-- open netrw explorer — disabled, using LazyVim's <leader>e instead
-- vim.keymap.set("n", "<leader>pv", vim.cmd.Ex)

-- tmux sessionizer — disabled, revisiting tmux workflow
-- vim.keymap.set("n", "<C-f>", "<cmd>silent !tmux neww tmux-sessionizer<CR>")

-- location list navigation — disabled, using Trouble (]d/[d) instead
-- vim.keymap.set("n", "<leader>k", "<cmd>lnext<CR>zz")
-- vim.keymap.set("n", "<leader>j", "<cmd>lprev<CR>zz")

-----------------------------------------------------------------------------
-- LSP keymaps
-----------------------------------------------------------------------------

-- NOTE: LazyVim already provides:
--   gd          go to definition (was <leader>gd)
--   gr          references (was <leader>vrr)
--   K           hover docs
--   <leader>ca  code action
--   <leader>cr  rename
--   <leader>cd  line diagnostics (was <leader>vd)
--   <leader>xx  list all diagnostics (was <leader>dl via Telescope)
--   ]d/[d       next/prev diagnostic (was <leader>dj/<leader>dk)
--   ]e/[e       next/prev error
--   ]w/[w       next/prev warning
--   gI          go to implementation
--   gD          go to declaration
--   <leader>uh  toggle inlay hints

-- rename alias — keeping old muscle memory alongside LazyVim's <leader>cr
vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, { desc = "Rename (alias)" })

-- old LSP keymaps — disabled, switched to LazyVim conventions
-- vim.keymap.set("n", "<leader>gd", vim.lsp.buf.definition)    -- now: gd
-- vim.keymap.set("n", "<leader>dl", "<cmd>Trouble diagnostics<cr>")  -- now: <leader>xx
-- vim.keymap.set("n", "<leader>dj", vim.diagnostic.goto_next)  -- now: ]d
-- vim.keymap.set("n", "<leader>dk", vim.diagnostic.goto_prev)  -- now: [d

-----------------------------------------------------------------------------
-- VSCode-neovim keymaps
-----------------------------------------------------------------------------
if vim.g.vscode then
  local vscode = require("vscode-neovim")

  -- debugger
  vim.keymap.set("n", "<leader>db", function()
    vscode.action("editor.debug.action.toggleBreakpoint")
  end)
  vim.keymap.set("n", "<leader>dc", function()
    vscode.action("workbench.action.debug.continue")
  end)
  vim.keymap.set("n", "<leader>dd", function()
    vscode.action("workbench.action.debug.start")
  end)
  vim.keymap.set("n", "<leader>dr", function()
    vscode.action("workbench.action.debug.restart")
  end)
  vim.keymap.set("n", "<leader>dq", function()
    vscode.action("workbench.action.debug.stop")
  end)
  vim.keymap.set("n", "<leader>dn", function()
    vscode.action("workbench.action.debug.stepOver")
  end)
  vim.keymap.set("n", "<leader>dj", function()
    vscode.action("workbench.action.debug.stepInto")
  end)
  vim.keymap.set("n", "<leader>dk", function()
    vscode.action("workbench.action.debug.stepOut")
  end)

  -- LSP
  vim.keymap.set("n", "<leader>gd", function()
    vscode.action("editor.action.goToDeclaration")
  end)
  vim.keymap.set("n", "<leader>rn", function()
    vscode.action("editor.action.rename")
  end)
  vim.keymap.set("v", "<leader>rn", function()
    vscode.action("editor.action.rename")
  end)
end
