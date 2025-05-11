if vim.g.vscode then
    -- VSCode extension
    -- require('pattobrien.lazy')
    require('pattobrien.remap')
    require('pattobrien.set')
    require('pattobrien.vscode.settings')
else
    require('pattobrien.lazy')
    require('pattobrien.remap')
    require('pattobrien.set')
end
