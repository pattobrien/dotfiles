return {
  -- TypeScript and Copilot extras are imported in lua/config/lazy.lua
  -- (required load order: base -> extras -> custom plugins).

  -- Disable inlay hints by default (toggle with <leader>uh)
  {
    "neovim/nvim-lspconfig",
    opts = {
      inlay_hints = { enabled = false },
      servers = {
        -- vtsls — TypeScript LSP (LazyVim default for the typescript extra).
        -- Setting names match VS Code's typescript.* and vtsls.* namespaces.
        -- See: https://github.com/yioneko/vtsls/blob/main/packages/service/configuration.schema.json
        vtsls = {
          settings = {
            typescript = {
              -- tsdk = "", -- override path to TypeScript lib if needed
            },
            vtsls = {
              autoUseWorkspaceTsdk = true,
            },
          },
        },
      },
    },
  },

  -- TODO: Bridge .vscode/settings.json into Neovim LSP settings so that
  -- project-level TS config (e.g. experimentalTsGo, tsdk overrides) is
  -- shared between Cursor/VS Code and Neovim.

  -- Format on save is handled by LazyVim via conform.nvim.
  -- Toggle with <leader>uf. Manual format with <leader>cf.
  -- LazyVim auto-configures:
  --   lua_ls (via lazydev.nvim — knows about vim global, nvim API)
  --   vtsls (via the typescript extra, configured above)
  --   Dart LSP (via flutter-tools in lang-flutter.lua)
}
