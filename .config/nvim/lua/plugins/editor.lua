return {
  -- Aliases for old muscle memory — mapped to LazyVim's keymaps so behavior is identical
  {
    "ibhagwan/fzf-lua",
    keys = {
      { "<leader>pf", LazyVim.pick("files"), desc = "Find Files (pf)" },
      { "<leader>ps", LazyVim.pick("live_grep"), desc = "Live Grep (ps)" },
    },
  },

  -- Enable treesitter-based indentation (fixes indent on `o` in TS files)
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      indent = { enable = true },
    },
  },

  -- vim-tmux-navigator — seamless <C-h/j/k/l> between nvim and tmux panes
  -- Disabled during LazyVim migration — uncomment if using tmux regularly.
  -- {
  --   "christoomey/vim-tmux-navigator",
  --   event = "VeryLazy",
  -- },
}
