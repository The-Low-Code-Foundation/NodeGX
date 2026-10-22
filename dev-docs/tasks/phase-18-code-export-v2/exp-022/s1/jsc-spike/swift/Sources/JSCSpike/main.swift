import Foundation
import JavaScriptCore

// The emitted web client, hosted unchanged: fetch is bridged to URLSession, everything else is the bundle's own.
let dir = CommandLine.arguments[1]
let ctx = JSContext()!
var finished = false
ctx.exceptionHandler = { _, e in FileHandle.standardError.write("JS exception: \(e?.toString() ?? "?")\n".data(using: .utf8)!) }
let report: @convention(block) (String) -> Void = { s in print(s); finished = true }
let nativeFetch: @convention(block) (String, String, JSValue, JSValue, JSValue) -> Void = { method, url, headers, body, done in
  var req = URLRequest(url: URL(string: url)!)
  req.httpMethod = method
  for (k, v) in (headers.toDictionary() as? [String: Any]) ?? [:] { req.setValue("\(v)", forHTTPHeaderField: k) }
  if body.isString { req.httpBody = body.toString().data(using: .utf8) }
  URLSession.shared.dataTask(with: req) { data, resp, err in
    let status = err == nil ? ((resp as? HTTPURLResponse)?.statusCode ?? 0) : 0
    let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
    DispatchQueue.main.async { done.call(withArguments: [status, text]) }
  }.resume()
}
ctx.setObject(report, forKeyedSubscript: "__report" as NSString)
ctx.setObject(nativeFetch, forKeyedSubscript: "__nativeFetch" as NSString)
for f in ["host-prelude.js", "client.js", "scenario.js"] {
  let src = try! String(contentsOfFile: dir + "/" + f, encoding: .utf8)
  ctx.evaluateScript(src, withSourceURL: URL(fileURLWithPath: f))
}
let deadline = Date().addingTimeInterval(10)
while !finished && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.01)) }
if !finished { print("TIMED OUT"); exit(1) }
