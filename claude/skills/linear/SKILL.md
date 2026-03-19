# Linear

Use the `linear` CLI to manage issues and documents in Linear.

- **View an issue:** `linear issue view ENG-123` (omit ID to infer from git
  branch)
- **List your issues:** `linear issue list` (defaults to unstarted; use
  `-s started` etc. to filter)
- **Create an issue:** `linear issue create -t "Title" -d "Description"`
- **Update an issue:** `linear issue update ENG-123 -s started` (supports `-t`,
  `-d`, `-s`, `-a`, `-p`)
- **Add a comment:** `linear issue comment add ENG-123`
- **Create a document:**
  `linear document create --title "Doc Title" --content-file ./path/to/file.md --issue ENG-123`
  - Don't use `--content` with inline text — `\n` won't be interpreted; always
    use `--content-file` with an actual `.md` file.
- Most commands infer the issue from the current git branch if the ID is
  omitted.
