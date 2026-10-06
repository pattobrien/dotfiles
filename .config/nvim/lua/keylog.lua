local M = {}

local dir = vim.fn.stdpath("state") .. "/keylog"
local pid = vim.fn.getpid()
local pending = {}
local skip = { i = true, R = true, t = true, c = true }

local function record(entry)
  local s, us = vim.uv.gettimeofday()
  entry.t = s * 1000 + math.floor(us / 1000)
  entry.ft = vim.bo.filetype
  entry.pid = pid
  pending[#pending + 1] = vim.json.encode(entry)
end

local function flush()
  if #pending == 0 then
    return
  end
  local f = assert(io.open(dir .. "/" .. os.date("%Y-%m-%d") .. ".jsonl", "a"))
  f:write(table.concat(pending, "\n"), "\n")
  f:close()
  pending = {}
end

local function captured_by_which_key(keys)
  local state = package.loaded["which-key.state"]
  if not state then
    return false
  end
  if state.state ~= nil then
    return true
  end
  local map = vim.fn.maparg(keys, require("which-key.util").mapmode(), false, true)
  return map.desc ~= nil and map.desc:find("which-key-trigger", 1, true) ~= nil
end

local function source_of(map)
  if map.callback then
    return debug.getinfo(map.callback, "S").source:gsub("^@", "")
  end
  if map.sid and map.sid > 0 then
    local info = vim.fn.getscriptinfo({ sid = map.sid })[1]
    return info and info.name or ""
  end
  return ""
end

local modes = { "n", "x", "o", "i", "c", "t" }

local function collect(maps, mode, into)
  for _, map in ipairs(maps) do
    into[#into + 1] = {
      mode = mode,
      lhs = map.lhs,
      rhs = map.rhs,
      desc = map.desc,
      src = source_of(map),
    }
  end
end

local function lsp_keys()
  local Config = require("lazy.core.config")
  local Plugin = require("lazy.core.plugin")
  local opts = Plugin.values(Config.plugins["nvim-lspconfig"], "opts", false)
  local out = {}
  for server, server_opts in pairs(opts.servers or {}) do
    for _, key in ipairs(type(server_opts) == "table" and server_opts.keys or {}) do
      out[#out + 1] = {
        server = server,
        mode = type(key.mode) == "table" and table.concat(key.mode, ",") or key.mode or "n",
        lhs = key[1],
        desc = key.desc,
        has = type(key.has) == "table" and table.concat(key.has, ",") or key.has,
      }
    end
  end
  return out
end

function M.dump_keymaps()
  local out = {
    generated = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    global = {},
    buffer = { filetype = vim.bo.filetype, maps = {} },
    lazy = {},
    lsp = lsp_keys(),
  }
  for _, mode in ipairs(modes) do
    collect(vim.api.nvim_get_keymap(mode), mode, out.global)
    collect(vim.api.nvim_buf_get_keymap(0, mode), mode, out.buffer.maps)
  end
  for _, plugin in pairs(require("lazy").plugins()) do
    for _, key in pairs(plugin._.handlers and plugin._.handlers.keys or {}) do
      out.lazy[#out.lazy + 1] = {
        plugin = plugin.name,
        mode = type(key.mode) == "table" and table.concat(key.mode, ",") or key.mode,
        lhs = key.lhs,
        desc = key.desc,
      }
    end
  end
  local path = dir .. "/keymaps.json"
  vim.fn.writefile({ vim.json.encode(out) }, path)
  return path
end

function M.setup()
  vim.fn.mkdir(dir, "p")

  vim.on_key(function(_, typed)
    if typed == "" then
      return
    end
    local mode = vim.api.nvim_get_mode().mode
    if skip[mode:sub(1, 1)] then
      return
    end
    local keys = vim.fn.keytrans(typed)
    if captured_by_which_key(keys) then
      return
    end
    record({ mode = mode, keys = keys })
  end, vim.api.nvim_create_namespace("keylog"))

  vim.api.nvim_create_autocmd("CmdlineLeave", {
    callback = function()
      if vim.v.event.abort or vim.fn.getcmdtype() ~= ":" then
        return
      end
      local cmd = vim.fn.getcmdline()
      if cmd:match("^%s*!") then
        return
      end
      record({ mode = "c", cmd = cmd })
    end,
  })

  local timer = assert(vim.uv.new_timer())
  timer:start(10000, 10000, vim.schedule_wrap(flush))
  vim.api.nvim_create_autocmd("VimLeavePre", { callback = flush })

  vim.api.nvim_create_user_command("KeylogDump", function()
    vim.notify("keymaps written to " .. M.dump_keymaps())
  end, {})
end

return M
