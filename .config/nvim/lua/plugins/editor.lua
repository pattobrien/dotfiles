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
      ensure_installed = { "json5", "caddy" }, -- hujson, Caddyfile
    },
  },

  -- flash.nvim — label each `/` search match so you can jump directly
  {
    "folke/flash.nvim",
    opts = {
      modes = {
        search = { enabled = true },
        char = { jump_labels = true },
      },
    },
  },

  -- herdr-splits — <C-h/j/k/l> move across nvim splits and herdr panes, <A-h/j/k/l> resize.
  -- Herdr side: `herdr plugin install lmilojevicc/herdr-splits.nvim` + ctrl/alt+hjkl in herdr config.toml
  {
    "lmilojevicc/herdr-splits.nvim",
    cond = vim.env.HERDR_ENV == "1",
    event = "VeryLazy",
    opts = {},
    keys = {
      { "<C-h>", function() require("herdr-splits").move_cursor_left() end, desc = "Go to Left Window" },
      { "<C-j>", function() require("herdr-splits").move_cursor_down() end, desc = "Go to Lower Window" },
      { "<C-k>", function() require("herdr-splits").move_cursor_up() end, desc = "Go to Upper Window" },
      { "<C-l>", function() require("herdr-splits").move_cursor_right() end, desc = "Go to Right Window" },
      { "<A-h>", function() require("herdr-splits").resize_left() end, desc = "Resize Window Left" },
      { "<A-j>", function() require("herdr-splits").resize_down() end, desc = "Resize Window Down" },
      { "<A-k>", function() require("herdr-splits").resize_up() end, desc = "Resize Window Up" },
      { "<A-l>", function() require("herdr-splits").resize_right() end, desc = "Resize Window Right" },
    },
  },
}
