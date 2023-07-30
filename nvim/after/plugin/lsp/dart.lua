local lsp = require("lspconfig")

local on_attach = require('pattobrien.lsp').on_attach
local capabilities = require('pattobrien.lsp').capabilities

local lastRootPath = nil

-- lsp["dartls"].setup({
--   capabilities = capabilities,
--   on_attach = on_attach,
--   init_options = {
--     onlyAnalyzeProjectsWithOpenFiles = "true",
--     suggestFromUnimportedLibraries = "true",
--     closingLabels = "true",
--     outline = "true",
--     flutterOutline = "true",
--   },
--   settings = {
--     dart = {
--       completeFunctionCalls = true,
--       showTodos = true,
--     },
--   },
--
--   autostart = true,
--   -- cmd = { "dart", "language-server", "--protocol=lsp" },
--   -- cmd = { "dart", "$DARTSDK<insert analyzer snapshot>", "--lsp" }
--   filetypes = { "dart", "yaml" },
--   root_dir = function(fname)
--     -- local fullpath = vim.fn.expand(fname, ':p')
--     -- local dir = vim.loop.cwd()
--     if lastRootPath ~= nil then
--       return lastRootPath
--     end
--     lastRootPath = lsp.util.root_pattern("pubspec.yaml")(fname)
--     return lastRootPath
--   end,
-- })

-- local telescope = require("telescope")
