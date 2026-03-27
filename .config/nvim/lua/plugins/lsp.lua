return {
  -- TypeScript and Copilot extras are imported in lua/config/lazy.lua
  -- (required load order: base -> extras -> custom plugins).

  -- Disable inlay hints by default (toggle with <leader>uh)
  {
    "neovim/nvim-lspconfig",
    opts = {
      inlay_hints = { enabled = false },
      servers = {
        -- tsgo — Microsoft's Go-based TS type checker (much faster than vtsls).
        -- Selected via vim.g.lazyvim_ts_lsp = "tsgo" in options.lua.
        -- Install: npm install -g @typescript/native-preview
      },
    },
  },

  -- Format on save is handled by LazyVim via conform.nvim.
  -- Toggle with <leader>uf. Manual format with <leader>cf.
  -- LazyVim auto-configures:
  --   lua_ls (via lazydev.nvim — knows about vim global, nvim API)
  --   tsgo (via the typescript extra + vim.g.lazyvim_ts_lsp in options.lua)
  --   Dart LSP (via flutter-tools in lang-flutter.lua)
}
