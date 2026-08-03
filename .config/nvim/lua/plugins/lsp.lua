return {
  -- TypeScript and Copilot extras are imported in lua/config/lazy.lua
  -- (required load order: base -> extras -> custom plugins).

  -- Disable inlay hints by default (toggle with <leader>uh)
  {
    "neovim/nvim-lspconfig",
    opts = {
      diagnostics = {
        update_in_insert = true,
      },
      inlay_hints = { enabled = false },
      servers = {
        -- tsgo — Microsoft's Go-based TS type checker (much faster than vtsls).
        -- Selected via vim.g.lazyvim_ts_lsp = "tsgo" in options.lua.
        -- Install: npm install -g @typescript/native-preview

        -- eslint — restrict to ts/tsx only (extra defaults include js/jsx/vue/svelte/astro),
        -- plus markdown for frontmatter schema validation via @eslint/markdown.
        eslint = {
          filetypes = { "typescript", "typescriptreact", "markdown" },
        },

        oxfmt = {},
        oxlint = {},

        -- copilot — everywhere except markdown (native LSP configs have no
        -- filetype denylist, so gate attach via root_dir)
        copilot = {
          root_dir = function(bufnr, on_dir)
            if vim.bo[bufnr].filetype ~= "markdown" then
              on_dir(vim.fs.root(bufnr, ".git") or vim.uv.cwd())
            end
          end,
        },

        -- oxfmt formats these filetypes; disable competing LSP formatters
        tsgo = {
          on_attach = function(client)
            client.server_capabilities.documentFormattingProvider = false
            client.server_capabilities.documentRangeFormattingProvider = false
          end,
        },
        jsonls = {
          init_options = { provideFormatter = false },
        },
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
