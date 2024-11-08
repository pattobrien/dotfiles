local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

if not vim.loop.fs_stat(lazypath) then
    vim.fn.system({
        "git",
        "clone",
        "--filter=blob:none",
        "https://github.com/folke/lazy.nvim.git",
        "--branch=stable", -- latest stable release
        lazypath,
    })
end

vim.opt.rtp:prepend(lazypath)

vim.g.mapleader = " " -- Make sure to set `mapleader` before lazy so your mappings are correct

if vim.g.vscode then
    require("lazy").setup({
        'numToStr/Comment.nvim', -- comment using gc
    })
    return
end

if vim.g.vscode == nil then
    require("lazy").setup({
        {
            "folke/which-key.nvim",
            event = 'VeryLazy',
            init = function()
                vim.o.timeout = true
                vim.o.timeoutlen = 300
            end,

        },
        "folke/neoconf.nvim",
        "folke/neodev.nvim",
        'nvim-lua/plenary.nvim',

        -- LSP
        'neovim/nvim-lspconfig',
        'williamboman/mason.nvim',
        'williamboman/mason-lspconfig.nvim',
        'onsails/lspkind.nvim', -- vscode-like icons for LSP
        {
            "j-hui/fidget.nvim",
            dependencies = {
                "nvim-telescope/telescope.nvim",
            },
            tag = "legacy",
        },
        -- visualize LSP analyzer status
        'folke/trouble.nvim',

        -- Autocompletion
        'hrsh7th/nvim-cmp',     -- Required
        'hrsh7th/cmp-nvim-lsp', -- Required
        'hrsh7th/cmp-buffer',   -- Optional
        'hrsh7th/cmp-path',     -- Optional

        -- Snippets
        'L3MON4D3/LuaSnip',             -- Required
        'rafamadriz/friendly-snippets', -- Optional
        'saadparwaiz1/cmp_luasnip',     -- Optional

        -- Debugger
        'mfussenegger/nvim-dap',
        'theHamsta/nvim-dap-virtual-text',
        'rcarriga/nvim-dap-ui',

        -- Telescope and telescope utilities
        'nvim-telescope/telescope.nvim',
        { "nvim-telescope/telescope-fzf-native.nvim", build = 'make' },
        'nvim-telescope/telescope-dap.nvim',
        'nvim-telescope/telescope-ui-select.nvim',

        -- Enhanced file navigation
        'theprimeagen/harpoon',
        'christoomey/vim-tmux-navigator', -- tmux & split window navigation
        'theprimeagen/git-worktree.nvim',

        -- Auto closing brackets/parentheses, comments etc
        'windwp/nvim-autopairs',
        'tpope/vim-surround',
        'numToStr/Comment.nvim', -- comment using gc
        'simrat39/symbols-outline.nvim',
        'mrjones2014/nvim-ts-rainbow',

        -- treesitter
        'nvim-treesitter/nvim-treesitter',
        -- Theme
        { "catppuccin/nvim",                          name = "catppuccin" },
        'kyazdani42/nvim-web-devicons',
        'bluz71/vim-nightfly-guicolors',

        -- GUI: file explorer, pop up windows, etc
        'kyazdani42/nvim-tree.lua',
        'rcarriga/nvim-notify',
        'folke/zen-mode.nvim',

        'MunifTanjim/nui.nvim',

        "m4xshen/hardtime.nvim",

        -- AI Tools
        'zbirenbaum/copilot.lua',
        'zbirenbaum/copilot-cmp',

        -- Git
        "tpope/vim-fugitive",
        'lewis6991/gitsigns.nvim',
        -- Obsidian
        {
            'epwalsh/obsidian.nvim',
            version = '*',
        },

        -- Command menu / picker
        -- 'FeiyouG/commander.nvim',
        'mrjones2014/legendary.nvim',
        -- Statusline
        'akinsho/bufferline.nvim',
        -- 'nvim-lualine/lualine.nvim',
        {
            'nvim-lualine/lualine.nvim',
            requires = { 'kyazdani42/nvim-web-devicons', opt = true, },
        },

        -- Flutter and Dart specific
        'akinsho/flutter-tools.nvim',
        'dart-lang/dart-vim-plugin',

        -- Lua specific
        'hrsh7th/cmp-nvim-lua',

        -- CheatSheet for remembering mappings
        'sudormrfbin/cheatsheet.nvim'

        -- testing
        -- use {
        --   "nvim-neotest/neotest",
        --   requires = {
        --     "nvim-treesitter/nvim-treesitter",
        --     "antoinemadec/FixCursorHold.nvim"
        --   }
        -- }

    }, {})
end
