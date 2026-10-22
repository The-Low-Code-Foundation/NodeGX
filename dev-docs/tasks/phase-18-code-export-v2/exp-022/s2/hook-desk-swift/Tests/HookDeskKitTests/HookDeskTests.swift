import XCTest
@testable import HookDeskKit

@MainActor
final class HookDeskTests: XCTestCase {
  func testSteps() throws {
    let steps = ["More", "Go A", "Go B", "Go A", "More", "pick b", "pick a", "More", "pick c"]
    let drive = Drive(RootView())
    defer { drive.close() }
    var readings = [drive.read()]
    for step in steps {
      XCTAssertTrue(drive.press(step), "no button \(step)")
      readings.append(drive.read())
    }
    let data = try JSONSerialization.data(withJSONObject: readings)
    print("READINGS " + String(data: data, encoding: .utf8)!)
  }
}
