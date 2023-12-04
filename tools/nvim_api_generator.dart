import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:messagepack/messagepack.dart';

class NeovimMetadataFetcher {
  Future<Map<dynamic, dynamic>> fetchApiInfo(String socketPath) async {
    final address = InternetAddress(socketPath, type: InternetAddressType.unix);
    final socket = await Socket.connect(address, 0);
    final requestId = 1;
    // final serialized = msgpack.serialize([0, requestId, "nvim_get_api_info", []]);
    final packer = Packer();
    packer.packListLength(4);
    packer.packInt(0);
    packer.packInt(requestId);
    packer.packString("nvim_get_api_info");
    packer.packListLength(0);
    final serialized = packer.takeBytes();

    socket.add(serialized);

    await socket.flush();

    final response = <int>[];

    final timer = Timer(Duration(seconds: 2), () {
      socket.close();
    });

    await for (final data in socket) {
      response.addAll(data);
    }

    // final List<int> response = await socket.first;
    // if (response.length == 16384) {
    //   final next = await socket.;
    // }
    final unpacker = Unpacker.fromList(response);
    final result = unpacker.unpackList();
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

    // final response = <int>[];
    // final result = msgpack.deserialize(
    //   Uint8List.fromList(response.sublist(4, response.length - 1)),
    // );
    // await for (final data in socket) {
    //   response.addAll(data);
    //   // if (await socket.isEmpty) {
    //   //   break;
    //   // }
    // }
    // final List result = msgpack.deserialize(Uint8List.fromList(response));
    socket.close();

    // The actual API metadata is in the second element of the response
    // return result[1];
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
