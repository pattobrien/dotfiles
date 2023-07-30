
local lsp = require("lspconfig")

local on_attach = require('pattobrien.lsp').on_attach
local capabilities = require('pattobrien.lsp').capabilities

lsp["tsserver"].setup({
  capabilities = capabilities,
  on_attach = on_attach,
})
