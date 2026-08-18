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

        -- gh_actions_ls — GitHub's Actions language server; only attaches to
        -- .github/workflows files. sessionToken + repos unlock `with:` input
        -- completion (fetched from each action's action.yml), runs-on labels,
        -- and environment names — without both, those value providers are off.
        gh_actions_ls = {
          before_init = function(params, config)
            local token = vim.trim(vim.fn.system({ "gh", "auth", "token" }))
            if vim.v.shell_error ~= 0 then
              return
            end
            local repo_root = vim.fs.root(config.root_dir, ".git")
            if not repo_root then
              return
            end
            local remote = vim.trim(vim.fn.system({ "git", "-C", repo_root, "remote", "get-url", "origin" }))
            local owner, name = remote:match("github%.com[:/]([^/]+)/([^/%s]+)")
            if not owner then
              return
            end
            -- params snapshots init_options before this hook runs, so set the
            -- request payload directly
            params.initializationOptions = {
              sessionToken = token,
              repos = {
                {
                  id = 0,
                  owner = owner,
                  name = name:gsub("%.git$", ""),
                  organizationOwned = false,
                  workspaceUri = vim.uri_from_fname(repo_root),
                },
              },
            }
          end,
        },

        -- yamlls — non-Actions yaml only; workflow files belong to
        -- gh_actions_ls, so gate attach via root_dir (same trick as copilot)
        yamlls = {
          root_dir = function(bufnr, on_dir)
            local name = vim.api.nvim_buf_get_name(bufnr)
            if not name:match("%.github/workflows/") then
              on_dir(vim.fs.root(bufnr, ".git") or vim.uv.cwd())
            end
          end,
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
