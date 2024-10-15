import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dart_nvim_api/dart_nvim_api.dart';
import 'package:msgpack_dart/msgpack_dart.dart';

class NeovimMetadataFetcher {
  Future<Map<dynamic, dynamic>> fetchApiInfo(String socketPath) async {
    final nvim = Nvim.spawn(
      onNotify: (p0, p1, p2) {
        print('onNotify: $p0, $p1, $p2');
      },
      onRequest: (p0, p1, p2) {
        print('onRequest: $p0, $p1, $p2');
      },
    );

    final address = InternetAddress(socketPath, type: InternetAddressType.unix);
    final socket = await Socket.connect(address, 0);
    final requestId = 1;
    // final serialized = msgpack.serialize([0, requestId, "nvim_get_api_info", []]);
    final request = serialize([0, requestId, "nvim_get_api_info", []]);

    socket.add(request);

    await socket.flush();

    Timer(Duration(seconds: 2), () => socket.close());

    final response = <int>[];

    await for (final data in socket) {
      response.addAll(data);
    }

    final result = deserialize(Uint8List.fromList(response));
    final api = result[3];
    if (api is! List) {
      throw Exception('Unexpected response from nvim_get_api_info');
    }

    final apiMap = api[1];
    if (apiMap is! Map) {
      throw Exception('Unexpected response from nvim_get_api_info');
    }
    print(apiMap);

    // write file to test.json
    final file = File('tools/test.json');
    await file.writeAsString(jsonEncode(apiMap));

    socket.close();

    return apiMap;
  }
}

void main() async {
  final path =
      '/var/folders/4g/ypl4dsnn1tzg1z6c6wrc2w4c0000gn/T/nvim.pattobrien/S3pB5h/nvim.72997.0';
  final fetcher = NeovimMetadataFetcher();
  final Map<dynamic, dynamic> apiInfo = await fetcher.fetchApiInfo(path);
  print(apiInfo);
}
