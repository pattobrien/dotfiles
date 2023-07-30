if vim.g.vscode then
  -- VSCode extension
  require('pattobrien.lazy')
  require('pattobrien.remap')
  require('pattobrien.set')
else
  -- ordinary Neovim
  require('pattobrien.lazy')
  require('pattobrien.remap')
  require('pattobrien.set')
end
