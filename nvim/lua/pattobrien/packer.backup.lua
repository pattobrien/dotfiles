local packer = require('packer')

require("lazy").setup(plugins, opts)

local packerSetup = packer.startup(function(use)
  -- Packer and plenary
  use('wbthomason/packer.nvim')
  use('nvim-lua/plenary.nvim')

  -- LSP
  use { 'neovim/nvim-lspconfig' }
  use { 'williamboman/mason.nvim' }
  use { 'williamboman/mason-lspconfig.nvim' }
  use { 'onsails/lspkind.nvim' } -- vscode-like icons for LSP

  -- Autocompletion
  use { 'hrsh7th/nvim-cmp' } -- Required
  use { 'hrsh7th/cmp-nvim-lsp' } -- Required
  use { 'hrsh7th/cmp-buffer' } -- Optional
  use { 'hrsh7th/cmp-path' } -- Optional

  -- Snippets
  use { 'L3MON4D3/LuaSnip' } -- Required
  use { 'rafamadriz/friendly-snippets' } -- Optional
  use { 'saadparwaiz1/cmp_luasnip' } -- Optional

  -- Debugger
  use('mfussenegger/nvim-dap')
  use('theHamsta/nvim-dap-virtual-text')
  use('rcarriga/nvim-dap-ui')

  -- Telescope and telescope utilities
  use({ 'nvim-telescope/telescope.nvim', tag = '0.1.1' })
  use({ "nvim-telescope/telescope-fzf-native.nvim", run = "make" })
  use('nvim-telescope/telescope-dap.nvim')

  -- Enhanced file navigation
  use('theprimeagen/harpoon')
  use('christoomey/vim-tmux-navigator') -- tmux & split window navigation

  -- Auto closing brackets, parenthesis, etc
  use("windwp/nvim-autopairs")
  use("tpope/vim-surround")
  use("numToStr/Comment.nvim") -- comment using gc
  use('simrat39/symbols-outline.nvim')
  -- use({
  --   "Pocco81/auto-save.nvim",
  --   config = function()
  --     require("auto-save").setup {
  --       -- your config goes here
  --       -- or just leave it empty :)
  --     }
  --   end,
  -- })
  -- Theme
  use({ "catppuccin/nvim", as = "catppuccin" })
  use({ 'kyazdani42/nvim-web-devicons' })

  -- GUI: file explorer, pop up windows, etc
  use("nvim-tree/nvim-tree.lua")
  use("rcarriga/nvim-notify")
  use("folke/zen-mode.nvim")
  use("lewis6991/gitsigns.nvim")

  -- Statusline
  use({ 'akinsho/bufferline.nvim', tag = "v3.*", })
  use("nvim-lualine/lualine.nvim")

  -- Treeshitter
  -- use('nvim-treesitter/nvim-treesitter', {run = ':TSUpdate'})
  -- use('nvim-treesitter/playground')

  -- LSP ui
  -- use('folke/trouble.nvim')
  -- use('glepnir/lspsaga.nvim')


  -- testing
  -- use {
  --   "nvim-neotest/neotest",
  --   requires = {
  --     "nvim-treesitter/nvim-treesitter",
  --     "antoinemadec/FixCursorHold.nvim"
  --   }
  -- }

  -- flutter and dart specific
  -- use('dart-lang/dart-vim-plugin')
  use('akinsho/flutter-tools.nvim')

  -- lua
  use { 'hrsh7th/cmp-nvim-lua' }

  -- learn vim motions
  use('ThePrimeagen/vim-be-good')
end)

-- auto install packer if not installed
local ensure_packer = function()
  local fn = vim.fn
  local install_path = fn.stdpath("data") .. "/site/pack/packer/start/packer.nvim"
  if fn.empty(fn.glob(install_path)) > 0 then
    fn.system({ "git", "clone", "--depth", "1", "https://github.com/wbthomason/packer.nvim", install_path })
    vim.cmd([[packadd packer.nvim]])
    return true
  end
  return false
end

local packer_bootstrap = ensure_packer() -- true if packer was just installed

-- autocommand that reloads neovim and installs/updates/removes plugins
-- when file is saved
vim.cmd([[
  augroup packer_user_config
    autocmd!
    autocmd BufWritePost packer.lua source <afile> | PackerSync
  augroup end
]])

-- import packer safely
local status, packer = pcall(require, "packer")
if not status then
  return
end

return packerSetup
