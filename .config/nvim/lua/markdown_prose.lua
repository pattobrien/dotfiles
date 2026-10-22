local M = {}

local prose_nodes = { paragraph = true, list_item = true, block_quote = true }
local block_nodes = {
  fenced_code_block = true,
  indented_code_block = true,
  pipe_table = true,
  html_block = true,
  atx_heading = true,
  setext_heading = true,
  link_reference_definition = true,
  minus_metadata = true,
  plus_metadata = true,
}
local max_reflow_lines = 40
local list_marker = [[^%s*[-*+]%s]]
local numbered_marker = [[^%s*%d+[.)]%s]]

local function is_marker(line)
  return line:match(list_marker) ~= nil or line:match(numbered_marker) ~= nil
end

local function is_blank_item(line)
  local rest = line:match(list_marker .. "(.*)$") or line:match(numbered_marker .. "(.*)$")
  if not rest then
    return false
  end
  return rest:gsub("^%[[ xX]%]", ""):match("^%s*$") ~= nil
end

local function in_reflowable_prose(buf)
  local parser = vim.treesitter.get_parser(buf, "markdown", { error = false })
  if not parser then
    return false
  end
  local row = vim.api.nvim_win_get_cursor(0)[1] - 1
  parser:parse({ row, row })
  local node = vim.treesitter.get_node({ bufnr = buf, lang = "markdown", ignore_injections = true })
  while node do
    local kind = node:type()
    if block_nodes[kind] then
      return false
    end
    if prose_nodes[kind] then
      local first, _, last = node:range()
      return last - first < max_reflow_lines
    end
    node = node:parent()
  end
  return false
end

local function line_is_settled(buf)
  local row = vim.api.nvim_win_get_cursor(0)[1]
  local text = vim.api.nvim_buf_get_lines(buf, row - 1, row, false)[1]:gsub("^%s+", "")
  if text == "" or is_blank_item(text) then
    return false
  end
  if text:find("%s") then
    return true
  end
  local above = row > 1 and vim.api.nvim_buf_get_lines(buf, row - 2, row - 1, false)[1] or ""
  return above == ""
end

local function sync_formatoptions(buf)
  local fo = vim.bo[buf].formatoptions
  local base = fo:gsub("[ta]", "")
  local want = line_is_settled(buf) and in_reflowable_prose(buf) and base .. "ta" or base
  if want ~= fo then
    vim.bo[buf].formatoptions = want
  end
end

function M.indentexpr()
  local lnum = vim.v.lnum
  local prev = vim.fn.prevnonblank(lnum - 1)
  if prev == 0 or prev < lnum - 1 then
    return 0
  end
  if not vim.fn.getline(lnum):match("^%s*$") then
    return vim.fn.indent(prev)
  end
  local l = prev
  while l > 0 do
    local line = vim.fn.getline(l)
    if line == "" then
      return 0
    end
    if is_marker(line) then
      return vim.fn.indent(l)
    end
    if vim.fn.indent(l) == 0 then
      return 0
    end
    l = l - 1
  end
  return 0
end

function M.attach(buf)
  if vim.bo[buf].textwidth == 0 then
    vim.bo[buf].textwidth = vim.b[buf].print_width or 80
  end
  vim.bo[buf].autoindent = true
  vim.bo[buf].smartindent = false
  vim.bo[buf].comments = "n:>"
  vim.bo[buf].indentexpr = [[v:lua.require("markdown_prose").indentexpr()]]
  vim.api.nvim_create_autocmd({ "CursorMoved", "CursorMovedI", "InsertEnter" }, {
    buffer = buf,
    callback = function()
      sync_formatoptions(buf)
    end,
  })
end

function M.setup()
  vim.api.nvim_create_autocmd("FileType", {
    pattern = "markdown",
    callback = function(ev)
      M.attach(ev.buf)
    end,
  })
end

return M
