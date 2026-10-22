local M = {}

local markers = {
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.cts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  ".oxfmtrc.json",
  ".oxfmtrc.jsonc",
}

local resolve_vite = [[
import("vite-plus").then(async ({ resolveConfig }) => {
  const config = await resolveConfig({ configFile: process.argv[1] }, "build");
  process.stdout.write(config.fmt ? String(config.fmt.printWidth ?? 0) : "");
});
]]

local print_width_query = vim.treesitter.query.parse(
  "json",
  [[
  (document (object (pair
    key: (string (string_content) @key)
    value: (number) @value
    (#eq? @key "printWidth"))))
]]
)

local function read_rc(config)
  local text = table.concat(vim.fn.readfile(config), "\n")
  local root = vim.treesitter.get_string_parser(text, "json"):parse()[1]:root()
  for id, node in print_width_query:iter_captures(root, text) do
    if print_width_query.captures[id] == "value" then
      return tonumber(vim.treesitter.get_node_text(node, text))
    end
  end
  return 0
end

local cache = {}
local waiting = {}

local function settle(config, width)
  cache[config] = width
  local callbacks = waiting[config]
  waiting[config] = nil
  for _, cb in ipairs(callbacks) do
    cb(width)
  end
end

local function resolve_config(config, cb)
  if cache[config] ~= nil then
    return cb(cache[config])
  end
  if waiting[config] then
    return table.insert(waiting[config], cb)
  end
  waiting[config] = { cb }
  if vim.fs.basename(config):match("^%.oxfmtrc%.jsonc?$") then
    return settle(config, read_rc(config))
  end
  vim.system({ "node", "-e", resolve_vite, config }, { cwd = vim.fs.dirname(config) }, function(out)
    vim.schedule(function()
      settle(config, out.code == 0 and tonumber(out.stdout) or false)
    end)
  end)
end

local function find_width(dir, cb)
  local root = vim.fs.root(dir, markers)
  if not root then
    return cb(nil)
  end
  for _, name in ipairs(markers) do
    local config = vim.fs.joinpath(root, name)
    if vim.uv.fs_stat(config) then
      return resolve_config(config, function(width)
        if width then
          cb(width)
        else
          find_width(vim.fs.dirname(root), cb)
        end
      end)
    end
  end
end

local function editorconfig_width(buf)
  local editorconfig = vim.b[buf].editorconfig or {}
  return tonumber(editorconfig.max_line_length)
end

local function apply(buf, width)
  if not vim.api.nvim_buf_is_valid(buf) then
    return
  end
  if width == 0 then
    width = editorconfig_width(buf) or 100
  elseif not width then
    width = editorconfig_width(buf)
  end
  vim.b[buf].print_width = width
  if width and vim.bo[buf].filetype == "markdown" then
    vim.bo[buf].textwidth = width
  end
  local colorcolumn = width and tostring(width) or vim.go.colorcolumn
  for _, win in ipairs(vim.fn.win_findbuf(buf)) do
    vim.api.nvim_set_option_value("colorcolumn", colorcolumn, { win = win, scope = "local" })
  end
end

function M.setup()
  vim.api.nvim_create_autocmd("BufEnter", {
    callback = function(ev)
      local name = vim.api.nvim_buf_get_name(ev.buf)
      if name == "" or vim.bo[ev.buf].buftype ~= "" then
        return
      end
      find_width(vim.fs.dirname(name), function(width)
        apply(ev.buf, width)
      end)
    end,
  })
end

return M
