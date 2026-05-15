return {
  -- Copilot native uses nvim 0.12's built-in vim.lsp.inline_completion.
  -- Ghost text only — does not integrate with completion menu.
  -- Extra is imported in lua/config/lazy.lua (required load order).

  -- Map <C-@> to blink.cmp show completion. Terminals send <C-@> (NUL) for
  -- Ctrl+Space, but blink.cmp only maps <C-Space>. Without this, <C-@> falls
  -- through to vim's default (insert last text + exit insert mode).
  {
    "saghen/blink.cmp",
    opts = {
      keymap = {
        ["<C-@>"] = { "show", "show_documentation", "hide_documentation" },
      },
    },
  },

  -- hardtime.nvim — trains you out of bad vim habits (e.g. repeated jjjj)
  -- Disabled during LazyVim migration — uncomment to re-enable.
  -- {
  --   "m4xshen/hardtime.nvim",
  --   event = "VeryLazy",
  --   opts = {},
  -- },
}
