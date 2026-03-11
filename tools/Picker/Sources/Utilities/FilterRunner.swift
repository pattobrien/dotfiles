import Foundation

func runFilter(query: String, items: [String], cmd: String) -> [String] {
    guard !query.isEmpty else { return items }

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = [cmd, "--filter", query]

    let stdinPipe = Pipe()
    let stdoutPipe = Pipe()
    process.standardInput = stdinPipe
    process.standardOutput = stdoutPipe
    process.standardError = FileHandle.nullDevice

    do {
        try process.run()
    } catch {
        // Fall back to simple contains filter if the command fails to launch
        let q = query.lowercased()
        return items.filter { $0.lowercased().contains(q) }
    }

    let input = items.joined(separator: "\n") + "\n"
    stdinPipe.fileHandleForWriting.write(input.data(using: .utf8)!)
    stdinPipe.fileHandleForWriting.closeFile()

    process.waitUntilExit()

    let outputData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
    let output = String(data: outputData, encoding: .utf8) ?? ""

    return
        output
        .split(separator: "\n", omittingEmptySubsequences: true)
        .map { String($0) }
}
