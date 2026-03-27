-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua

-- These are already set by LazyVim and don't need to be repeated:
--   number, relativenumber, expandtab, tabstop=2, shiftwidth=2, smartindent,
--   wrap=false, ignorecase, smartcase, cursorline, termguicolors, signcolumn="yes",
--   clipboard="unnamedplus", splitright, splitbelow, undofile, inccommand="nosplit",
--   showmode=false, laststatus=3, smoothscroll, shiftround, confirm, autowrite

-- TypeScript LSP: "vtsls" (default), "ts_ls", or "tsgo"
-- tsgo is Microsoft's Go-based TS type checker — much faster, but still preview.
-- Install: npm install -g @typescript/native-preview
vim.g.lazyvim_ts_lsp = "tsgo"

-- Use git root (then cwd) instead of LSP root for <leader>ff, neo-tree, etc.
-- Prevents monorepo packages from hijacking the root dir.
vim.g.root_spec = { { ".git" }, "cwd" }

-- Personal overrides (diverge from LazyVim defaults)
vim.opt.scrolloff = 8
-- vim.opt.updatetime = 50
vim.opt.colorcolumn = "80"
vim.opt.fillchars = { vert = "|", fold = " ", eob = " " }

-- Disable LazyVim's list=true — shows trailing spaces as hyphens via listchars.
vim.opt.list = false

-- Disable smooth scrolling — <C-d>/<C-u> are instant (with zz centering in keymaps)
vim.opt.smoothscroll = false
-- vim.opt.iskeyword:append("-")
