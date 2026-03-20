return {
  -- TypeScript and Copilot extras are imported in lua/config/lazy.lua
  -- (required load order: base -> extras -> custom plugins).

  -- Disable inlay hints by default (toggle with <leader>uh)
  {
    "neovim/nvim-lspconfig",
    opts = {
      inlay_hints = { enabled = false },
    },
  },

  -- Format on save is handled by LazyVim via conform.nvim.
  -- Toggle with <leader>uf. Manual format with <leader>cf.
  -- No additional LSP config needed — LazyVim auto-configures:
  --   lua_ls (via lazydev.nvim — knows about vim global, nvim API)
  --   ts_ls (via the typescript extra)
  --   Dart LSP (via flutter-tools in lang-flutter.lua)
}
