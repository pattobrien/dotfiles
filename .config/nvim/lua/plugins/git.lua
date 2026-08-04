return {
  -- codediff — VSCode-style diff rendering (two-tier highlights, side-by-side/inline)
  {
    "esmuellert/codediff.nvim",
    cmd = "CodeDiff",
    opts = {},
  },

  -- review.nvim — tuicr-style local review comments on top of codediff
  {
    "georgeguimaraes/review.nvim",
    version = "v*",
    dependencies = {
      "esmuellert/codediff.nvim",
      "MunifTanjim/nui.nvim",
    },
    cmd = "Review",
    keys = {
      { "<leader>gr", "<cmd>Review<cr>", desc = "Review (working tree)" },
      { "<leader>gR", "<cmd>Review commits<cr>", desc = "Review (pick commits)" },
    },
    config = function(_, opts)
      require("review").setup(opts)
      -- disable the hardcoded 7-day session expiry (storage.lua deletes stale JSON on load)
      require("review.storage").cleanup_expired = function() end
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
