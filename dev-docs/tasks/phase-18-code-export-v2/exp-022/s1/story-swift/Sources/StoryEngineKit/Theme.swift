// @nodegx:generated (EXP-022) — the design tokens the views read, from the project's token table.
import SwiftUI

public enum Theme {
  /// `--accent`: #dfeae5
  public static let accent: Color = Color(hex: 0xdfeae5)
  /// `--accent-foreground`: #1d5448
  public static let accentForeground: Color = Color(hex: 0x1d5448)
  /// `--background`: #fbf8f3
  public static let background: Color = Color(hex: 0xfbf8f3)
  /// `--border`: #e0d7c8
  public static let border: Color = Color(hex: 0xe0d7c8)
  /// `--border-1`: 1px
  public static let border1: CGFloat = 1
  /// `--border-2`: 2px
  public static let border2: CGFloat = 2
  /// `--border-control`: #8a7d69
  public static let borderControl: Color = Color(hex: 0x8a7d69)
  /// `--border-strong`: #c9bca6
  public static let borderStrong: Color = Color(hex: 0xc9bca6)
  /// `--destructive`: #9b2226
  public static let destructive: Color = Color(hex: 0x9b2226)
  /// `--font-bold`: 700
  public static let fontBold: Font.Weight = .bold
  /// `--font-medium`: 500
  public static let fontMedium: Font.Weight = .medium
  /// `--font-mono`: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace
  public static let fontMono: Font.Design = .monospaced
  /// `--font-semibold`: 600
  public static let fontSemibold: Font.Weight = .semibold
  /// `--font-serif`: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif
  public static let fontSerif: Font.Design = .serif
  /// `--foreground`: #221d18
  public static let foreground: Color = Color(hex: 0x221d18)
  /// `--leading-relaxed`: 1.625
  public static let leadingRelaxed: CGFloat = 1.625
  /// `--leading-snug`: 1.375
  public static let leadingSnug: CGFloat = 1.375
  /// `--leading-tight`: 1.25
  public static let leadingTight: CGFloat = 1.25
  /// `--muted-foreground`: #635848
  public static let mutedForeground: Color = Color(hex: 0x635848)
  /// `--primary`: #8a4f16
  public static let primary: Color = Color(hex: 0x8a4f16)
  /// `--primary-foreground`: #fdf9f2
  public static let primaryForeground: Color = Color(hex: 0xfdf9f2)
  /// `--radius-full`: 9999px
  public static let radiusFull: CGFloat = 9999
  /// `--radius-lg`: 8px
  public static let radiusLg: CGFloat = 8
  /// `--radius-md`: 5px
  public static let radiusMd: CGFloat = 5
  /// `--space-1`: 4px
  public static let space1: CGFloat = 4
  /// `--space-16`: 64px
  public static let space16: CGFloat = 64
  /// `--space-2`: 8px
  public static let space2: CGFloat = 8
  /// `--space-3`: 12px
  public static let space3: CGFloat = 12
  /// `--space-4`: 16px
  public static let space4: CGFloat = 16
  /// `--space-5`: 20px
  public static let space5: CGFloat = 20
  /// `--space-6`: 24px
  public static let space6: CGFloat = 24
  /// `--space-8`: 32px
  public static let space8: CGFloat = 32
  /// `--surface`: #f4efe6
  public static let surface: Color = Color(hex: 0xf4efe6)
  /// `--text-3xl`: 30px
  public static let text3xl: CGFloat = 30
  /// `--text-base`: 16px
  public static let textBase: CGFloat = 16
  /// `--text-lg`: 18px
  public static let textLg: CGFloat = 18
  /// `--text-sm`: 14px
  public static let textSm: CGFloat = 14
  /// `--text-xs`: 12px
  public static let textXs: CGFloat = 12
  /// `--tracking-tight`: -0.025em
  public static let trackingTight: CGFloat = -0.025
  /// `--tracking-tighter`: -0.05em
  public static let trackingTighter: CGFloat = -0.05
  /// `--tracking-widest`: 0.1em
  public static let trackingWidest: CGFloat = 0.1

  /// A color a value names at run time (a States node's color values arrive as `var(--token)` text).
  public static func color(_ text: String) -> Color? {
    switch text {
    case "var(--accent)": return accent
    case "var(--accent-foreground)": return accentForeground
    case "var(--background)": return background
    case "var(--border)": return border
    case "var(--border-control)": return borderControl
    case "var(--border-strong)": return borderStrong
    case "var(--destructive)": return destructive
    case "var(--foreground)": return foreground
    case "var(--muted-foreground)": return mutedForeground
    case "var(--primary)": return primary
    case "var(--primary-foreground)": return primaryForeground
    case "var(--surface)": return surface
    default: return nil
    }
  }
}

extension Color {
  init(hex: UInt32, opacity: Double = 1) {
    self.init(red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: opacity)
  }
}
