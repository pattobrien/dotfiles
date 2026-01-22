

if vim.g.vscode then
  return
end

local lsp = require("lspconfig")

local on_attach = require('pattobrien.lsp').on_attach
local capabilities = require('pattobrien.lsp').capabilities

lsp["tsserver"].setup({
  capabilities = capabilities,
  on_attach = on_attach,
  handlers = {
    ["textDocument/publishDiagnostics"] = vim.lsp.with(
        vim.lsp.diagnostic.on_publish_diagnostics,
        { virtual_text = false, signs = true, update_in_insert = false, underline = true}
    ),
  }
})