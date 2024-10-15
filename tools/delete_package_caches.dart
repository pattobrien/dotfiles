import 'dart:io';

import 'package:dcli/dcli.dart';

void main() {
  final rootDir = '/Users/pattobrien/dev';
  late bool isDryRun = false;
  // final durationToKeep = 1;
  final durationToKeep = 14 * 24 * 60 * 60; // 14 days
  final sizeToKeep = 1 * 1024 * 1024; // 1MB

  final dartToolOrNodeModulesPattern = RegExp(r'\.dart_tool|node_modules');

  final allDirectoriesPaths = find(
    dartToolOrNodeModulesPattern.pattern,
    recursive: true,
    types: [Find.directory],
    workingDirectory: rootDir,
  ).toList();

  final dirs = allDirectoriesPaths.map((dir) {
    final directory = Directory(dir);
    final size = directory.listSync(recursive: true).fold<int>(
        0,
        (prev, element) =>
            prev + (element is File ? element.statSync().size : 0));
    final lastChanged = Directory(dir).statSync().modified;
    return DependencyDirectory(dir, size, lastChanged: lastChanged);
  }).toList();

  // -- delete directories that were changed more than 14 days ago --

  final directoriesToDelete = dirs
      .where((dir) =>
          DateTime.now().difference(dir.lastChanged) >
              Duration(seconds: durationToKeep) &&
          dir.size > sizeToKeep)
      .toList();

  if (isDryRun) {
    print('DRY RUN: ${directoriesToDelete.length} directories will be deleted');
    for (final dir in directoriesToDelete) {
      print(dir);
    }
  } else {
    print('Deleting ${directoriesToDelete.length} directories:');
    for (final dir in directoriesToDelete) {
      print('Deleting: ${dir.absolutePath}');
      deleteDir(dir.absolutePath, recursive: true);
    }
  }

  print('Completed.');
}

class DependencyDirectory {
  final String absolutePath;
  final int size;
  final DateTime lastChanged;

  const DependencyDirectory(
    this.absolutePath,
    this.size, {
    required this.lastChanged,
  });

  @override
  String toString() {
    final lastChangedAgo = DateTime.now().difference(lastChanged);
    final friendlyAgo = lastChangedAgo.inDays > 0
        ? '${lastChangedAgo.inDays} days ago'
        : lastChangedAgo.inHours > 0
            ? '${lastChangedAgo.inHours} hours ago'
            : lastChangedAgo.inMinutes > 0
                ? '${lastChangedAgo.inMinutes} minutes ago'
                : 'just now';
    return 'size: $size, changed: $friendlyAgo, path: $absolutePath';
  }
}
