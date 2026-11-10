// Browser file download without extra packages: an <a download> pointing at a Blob of the text.
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

void downloadText(String fileName, String text) {
  final document = globalContext['document'] as JSObject;
  final blobClass = globalContext['Blob'] as JSFunction;
  final blob = blobClass.callAsConstructor<JSObject>(
    [text.toJS].toJS,
    JSObject()..['type'] = 'text/plain;charset=utf-8'.toJS,
  );
  final url = (globalContext['URL'] as JSObject).callMethod<JSString>('createObjectURL'.toJS, blob);
  final a = document.callMethod<JSObject>('createElement'.toJS, 'a'.toJS)
    ..['href'] = url
    ..['download'] = fileName.toJS;
  (document['body'] as JSObject).callMethod('appendChild'.toJS, a);
  a.callMethod('click'.toJS);
  a.callMethod('remove'.toJS);
  (globalContext['URL'] as JSObject).callMethod('revokeObjectURL'.toJS, url);
}
