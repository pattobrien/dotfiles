return {
  -- Copilot native uses nvim 0.12's built-in vim.lsp.inline_completion.
  -- Ghost text only — does not integrate with completion menu.
  -- Extra is imported in lua/config/lazy.lua (required load order).

  -- hardtime.nvim — trains you out of bad vim habits (e.g. repeated jjjj)
  -- Disabled during LazyVim migration — uncomment to re-enable.
  -- {
  --   "m4xshen/hardtime.nvim",
  --   event = "VeryLazy",
  --   opts = {},
  -- },
}
