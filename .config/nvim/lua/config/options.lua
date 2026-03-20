-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua

-- These are already set by LazyVim and don't need to be repeated:
--   number, relativenumber, expandtab, tabstop=2, shiftwidth=2, smartindent,
--   wrap=false, ignorecase, smartcase, cursorline, termguicolors, signcolumn="yes",
--   clipboard="unnamedplus", splitright, splitbelow, undofile, inccommand="nosplit",
--   showmode=false, laststatus=3, smoothscroll, shiftround, confirm, autowrite

-- Personal overrides (diverge from LazyVim defaults)
vim.opt.scrolloff = 8
-- vim.opt.updatetime = 50
vim.opt.colorcolumn = "80"
vim.opt.fillchars = { vert = "|", fold = " ", eob = " " }
-- vim.opt.iskeyword:append("-")
