return {
  -- codediff — VSCode-style diff rendering (two-tier highlights, side-by-side/inline)
  {
    "esmuellert/codediff.nvim",
    cmd = "CodeDiff",
    opts = {},
  },

  -- atlas replaces the snacks gh_issue/gh_pr pickers on the same keys
  {
    "folke/snacks.nvim",
    keys = {
      { "<leader>gi", false },
      { "<leader>gI", false },
      { "<leader>gp", false },
      { "<leader>gP", false },
    },
  },

  -- atlas — GitHub PR review (threads, suggestions, viewed state) in AtlasDiff
  {
    "emrearmagan/atlas.nvim",
    cmd = { "Atlas", "AtlasDiff", "AtlasPr" },
    keys = {
      { "<leader>gp", "<cmd>AtlasPr<cr>", desc = "Review PR (current branch)" },
      { "<leader>gP", "<cmd>Atlas pulls github<cr>", desc = "Pull Requests (Atlas)" },
      { "<leader>gi", "<cmd>Atlas issues github<cr>", desc = "Issues (Atlas)" },
    },
    opts = {
      providers = { github = {} },
      pulls = {
        repo_config = { paths = { ["pattobrien/*"] = "~/dev/pattobrien/*" } },
        diff = {
          comment_display = "virtual_text",
          explorer = { preview = true },
        },
      },
    },
    config = function(_, opts)
      require("atlas").setup(opts)
      vim.api.nvim_create_autocmd("User", {
        pattern = "AtlasDiffOpened",
        callback = function(ev)
          vim.t[ev.data.tabpage].atlas_diff = true
          vim.o.showtabline = 0
        end,
      })
      vim.api.nvim_create_autocmd("TabLeave", {
        callback = function()
          if not vim.t.atlas_diff then
            vim.g.atlas_saved_showtabline = vim.o.showtabline
          end
        end,
      })
      vim.api.nvim_create_autocmd("TabEnter", {
        callback = function()
          vim.o.showtabline = vim.t.atlas_diff and 0 or vim.g.atlas_saved_showtabline or 2
        end,
      })
      vim.api.nvim_create_user_command("AtlasPr", function(cmd)
        local argv = { "gh", "pr", "view", "--json", "url", "--jq", ".url" }
        if cmd.args ~= "" then
          table.insert(argv, 4, cmd.args)
        end
        local result = vim.system(argv, { text = true }):wait()
        if result.code ~= 0 then
          vim.notify(vim.trim(result.stderr), vim.log.levels.ERROR)
          return
        end
        vim.cmd.Atlas("review", vim.trim(result.stdout))
      end, { nargs = "?", desc = "Open the PR diff for a branch, PR number, or URL (default: current branch)" })
    end,
  },

  -- diffview-plus — maintained fork of diffview.nvim for PR-style diff review
  {
    "dlyongemallo/diffview-plus.nvim",
    main = "diffview",
    opts = {},
    cmd = {
      "DiffviewOpen",
      "DiffviewClose",
      "DiffviewFileHistory",
      "DiffviewToggleFiles",
      "DiffviewFocusFiles",
      "DiffviewRefresh",
      "DiffviewLog",
    },
    keys = {
      { "<leader>gv", "<cmd>DiffviewOpen<cr>", desc = "Diffview (working tree)" },
      { "<leader>gV", "<cmd>DiffviewOpen origin/HEAD...HEAD<cr>", desc = "Diffview (PR diff vs origin)" },
    },
  },
}
