return {
  -- Additional picker keymaps to match old muscle memory
  {
    "ibhagwan/fzf-lua",
    keys = {
      -- old ThePrimeagen-style keymaps (LazyVim also has <leader>ff and <leader>sg)
      { "<leader>pf", "<cmd>FzfLua files<cr>", desc = "Find Files (pf)" },
      { "<leader>ps", "<cmd>FzfLua live_grep<cr>", desc = "Live Grep (ps)" },
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
