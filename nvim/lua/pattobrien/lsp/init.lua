local mason = require('mason')
local mason_lspconfig = require('mason-lspconfig')

mason.setup()
mason_lspconfig.setup({
  format_on_save = true, -- true/false or table of filetypes {'.ts', '.js',}
  format_timeout = 2000,
  rename_notification = true,
  ensure_installed = {
    'tsserver',
    'lua_ls',
  },
})

local luasnip = require('luasnip')
-- require("luasnip/loaders/from_vscode").lazy_load()
local lsp = require("lspconfig")
-- vim.lsp.set_log_level("trace")

local cmp = require('cmp')
local cmp_select = { behavior = cmp.SelectBehavior.Select }
local lspkind = require('lspkind')

cmp.setup({
  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },
  mapping = cmp.mapping.preset.insert({
    ['<C-Space>'] = cmp.mapping.complete(),
    ['<C-e>'] = cmp.mapping.abort(),
    ['<CR>'] = cmp.mapping.confirm({
      behavior = cmp.ConfirmBehavior.Insert,
      select = true,
    }),

    -- cmp_mappings['<Tab>'] = nil
    -- cmp_mappings['<S-Tab>'] = nil

  }),
  sources = cmp.config.sources({
    { name = "luasnip" },
    -- { name = "buffer" },
    { name = "path" },
    { name = "nvim_lsp" },
  }),
  formatting = {
    format = lspkind.cmp_format {
      with_text = true,
    },
  },
  experimental = {
    ghost_text = true,
  },
})

local on_attach = function(client, bufnr)
  -- local opts = {buffer = bufnr, remap = false}
  local opts = { buffer = 0, remap = false }

  vim.keymap.set("n", "gd", function() vim.lsp.buf.definition() end, opts)
  vim.keymap.set("n", "gt", vim.lsp.buf.type_definition, opts)
  vim.keymap.set("n", "<leader>dj", vim.diagnostic.goto_next, opts)
  vim.keymap.set("n", "<leader>dk", vim.diagnostic.goto_prev, opts)
  vim.keymap.set("n", "<leader>dl", "<cmd>Telescope diagnostics<cr>", opts)
  vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
  vim.keymap.set("n", "<leader>vws", vim.lsp.buf.workspace_symbol, opts)
  vim.keymap.set("n", "<leader>vd", vim.diagnostic.open_float, opts)
  vim.keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, opts)
  vim.keymap.set("n", "<leader>vrr", vim.lsp.buf.references, opts)
  vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)
  vim.keymap.set("i", "<C-h>", vim.lsp.buf.signature_help, opts)


  -- local colorscheme = require('catppuccin')
  -- vim.highlight = colorscheme.highlight
  -- vim.diagnostic.highlight = colorscheme.highlight
  vim.diagnostic.config({
    virtual_text = {
      source = "always", -- Or "if_many"
      -- prefix = 'x', -- Could be '●', '▎', 'x'
    },
    -- signs = true,
    underline = true,
    update_in_insert = true,
    severity_sort = false,
    float = {
      source = "always", -- Or "if_many"
    },
  })

  -- format on save
  -- if client.resolved_capabilities.document_formatting then
  vim.api.nvim_create_autocmd("BufWritePre", { callback = function() vim.lsp.buf.format() end })
  -- end
end

local capabilities = require("cmp_nvim_lsp").default_capabilities()

return {
  on_attach = on_attach,
  capabilities = capabilities,
}
