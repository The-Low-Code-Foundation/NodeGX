// @nodegx:generated (EXP-022) — the design tokens the views read, from the project's token table.
import SwiftUI

public enum Theme {

  /// A color a value names at run time (a States node's color values arrive as `var(--token)` text).
  public static func color(_ text: String) -> Color? {
    switch text {
    default: return nil
    }
  }
}

extension Color {
  init(hex: UInt32, opacity: Double = 1) {
    self.init(red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: opacity)
  }
}
