// EXP-022 S4: todo-list driven in the simulator as a person drives it, against the real backend `backend.ts` seeds.
// `drive.cjs` copies this file into the printed package's `TodoListUITests/` (a synchronized folder) and runs it with
// `xcodebuild test-without-building`. Each reading is one `S4READ {json}` line on stdout: every text and button label
// accessibility exposes, in the order the page draws them. Screenshots go to S4_SHOTS (a host folder).
import XCTest

final class TodoListDrive: XCTestCase {
  let env = ProcessInfo.processInfo.environment

  /// Every static text and button label on screen, top to bottom, from one accessibility snapshot.
  func read(_ app: XCUIApplication) -> [String: Any] {
    var texts: [String] = []
    var buttons: [String] = []
    var fields: [String] = []
    func walk(_ e: XCUIElementSnapshot) {
      switch e.elementType {
      case .staticText: if !e.label.isEmpty { texts.append(e.label) }
      case .button: buttons.append(e.label)
      case .textField, .secureTextField: fields.append("\(e.elementType == .secureTextField ? "secure" : "text"):\(e.label):\(e.placeholderValue ?? "")")
      default: break
      }
      for c in e.children { walk(c) }
    }
    for _ in 0..<5 {
      if let snap = try? app.snapshot() { walk(snap); break }
      Thread.sleep(forTimeInterval: 0.5)
    }
    return ["texts": texts, "buttons": buttons, "fields": fields]
  }

  func emit(_ step: String, _ app: XCUIApplication, _ extra: [String: Any] = [:]) {
    var r = read(app)
    r["step"] = step
    r["unhittable"] = unhittable
    let clock = ISO8601DateFormatter()
    clock.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    r["at"] = clock.string(from: Date())
    for (k, v) in extra { r[k] = v }
    let data = try! JSONSerialization.data(withJSONObject: r, options: [.sortedKeys])
    print("S4READ " + String(data: data, encoding: .utf8)!)
    if let dir = env["S4_SHOTS"] {
      try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("swift-\(step).png"))
    }
  }

  func button(_ app: XCUIApplication, _ label: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch
  }

  /// Every element the drive pressed that XCUITest called not hittable, pressed at its centre as a finger would.
  var unhittable: [String] = []
  func press(_ el: XCUIElement, _ name: String) {
    if el.isHittable { el.tap(); return }
    unhittable.append(name)
    el.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
  }

  func field(_ query: XCUIElementQuery, _ label: String) -> XCUIElement {
    query.matching(NSPredicate(format: "label == %@", label)).firstMatch
  }

  /// Waits until a button whose label starts with `prefix` shows, and says whether it did.
  func waitButton(_ app: XCUIApplication, prefix: String, _ seconds: TimeInterval = 15) -> Bool {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch.waitForExistence(timeout: seconds)
  }

  /// Lets the page settle: its requests answered and the lists drawn (the backend is local; two seconds is ample).
  func settle() { Thread.sleep(forTimeInterval: 2) }

  @MainActor
  func testSignInAddCloseRelaunch() throws {
    let email = env["S4_EMAIL"] ?? ""
    let password = env["S4_PASSWORD"] ?? ""
    let newTask = "Pick up the dry cleaning"
    let closing = "Write the release notes"
    let app = XCUIApplication.nodegx()
    app.launch()

    // D0: a fresh install opens on the Sign in page.
    _ = field(app.textFields, "Email").waitForExistence(timeout: 20)
    emit("D0", app)

    // D1: sign in through the page's own fields.
    let emailField = field(app.textFields, "Email")
    press(emailField, "Email")
    emailField.typeText(email)
    let passwordField = field(app.secureTextFields, "Password")
    press(passwordField, "Password")
    passwordField.typeText(password)
    press(button(app, "Sign in"), "Sign in")
    // A real password field: iOS offers to save the password. A person says "Not Now"; so does the drive.
    let notNow = button(app, "Not Now")
    let offered = notNow.waitForExistence(timeout: 5)
    if offered { press(notNow, "Not Now") }
    let left = waitButton(app, prefix: "List (")
    settle()
    emit("D1", app, ["reachedTodo": left, "savePasswordOffered": offered])

    // D2 is D1's reading of the list (kept apart to line up with s137's table).
    emit("D2", app)

    // D3: add a task through the field and Add.
    let add = app.textFields.matching(NSPredicate(format: "placeholderValue BEGINSWITH %@", "Add a task")).firstMatch
    let addFound = add.waitForExistence(timeout: 5)
    press(add, "Add a task")
    add.typeText(newTask)
    press(app.buttons["tlButton"], "Add")
    let four = waitButton(app, prefix: "List (4)", 10)
    settle()
    emit("D3", app, ["addFound": addFound, "listFour": four])

    // D4: close the release notes: the circle on its row (the trClose nearest its title), then the dialog's OK.
    let title = app.staticTexts[closing]
    let titleFound = title.waitForExistence(timeout: 5)
    let circles = app.buttons.matching(identifier: "trClose").allElementsBoundByIndex
    let circle = circles.min { abs($0.frame.midY - title.frame.midY) < abs($1.frame.midY - title.frame.midY) }
    if let circle { press(circle, "trClose") }
    let ok = app.buttons["ndOk"]
    let dialog = ok.waitForExistence(timeout: 10)
    emit("D4dialog", app, ["titleFound": titleFound, "circles": circles.count, "dialog": dialog])
    if dialog {
      let note = app.textFields.matching(NSPredicate(format: "placeholderValue BEGINSWITH %@", "What happened")).firstMatch
      press(note, "What happened?")
      note.typeText("Sent to the printer.")
      press(ok, "ndOk")
    }
    let closed = waitButton(app, prefix: "Done (2)", 10)
    settle()
    emit("D4", app, ["doneTwo": closed])

    // D5: relaunch; the session and the list come back from the device and the backend.
    app.terminate()
    app.launch()
    let back = waitButton(app, prefix: "List (", 20)
    settle()
    emit("D5", app, ["signedIn": back])

    // D6: sign out, then relaunch: the Sign in page both times.
    press(button(app, "Sign out"), "Sign out")
    let out = field(app.textFields, "Email").waitForExistence(timeout: 10)
    emit("D6", app, ["signInPage": out])
    app.terminate()
    app.launch()
    let still = field(app.textFields, "Email").waitForExistence(timeout: 20)
    settle()
    emit("D6relaunch", app, ["signInPage": still])
  }
}
