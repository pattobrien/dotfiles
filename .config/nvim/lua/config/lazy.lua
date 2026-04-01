local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

if not vim.uv.fs_stat(lazypath) then
  local lazyrepo = "https://github.com/folke/lazy.nvim.git"
  local out = vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "--branch=stable",
    lazyrepo,
    lazypath,
  })

  if vim.v.shell_error ~= 0 then
    vim.api.nvim_echo({
      { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
      { out,                            "WarningMsg" },
      { "\nPress any key to exit..." },
    }, true, {})
    vim.fn.getchar()
    os.exit(1)
  end
end

vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  spec = {
    -- 1. LazyVim base plugins
    { "LazyVim/LazyVim", import = "lazyvim.plugins" },

    -- 2. LazyVim extras (must come before custom plugins)
    { import = "lazyvim.plugins.extras.vscode" },
    { import = "lazyvim.plugins.extras.ai.copilot-native" },
    { import = "lazyvim.plugins.extras.lang.typescript" }, -- tsgo config in options.lua
    { import = "lazyvim.plugins.extras.lang.json" },

    -- 3. personal plugins (lua/plugins/*.lua)
    { import = "plugins" },
  },

  defaults = {
    lazy = false,
    version = false,
  },

  install = {
    colorscheme = { "catppuccin", "habamax" },
  },

  checker = {
    enabled = true,
    notify = false,
  },

  performance = {
    rtp = {
      disabled_plugins = {
        "gzip",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})
