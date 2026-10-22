// @nodegx:generated (EXP-022) — the Router: which page is showing. A navigate replaces the page, as the web router does.
import SwiftUI

public enum Route: Hashable {
  case home
}

public final class AppRouter: ObservableObject {
  @Published public var current: Route = .home
  public init() {}
  public func go(_ route: Route) { current = route }
}

/// The app: the page the router shows.
public struct RootView: View {
  @StateObject private var router = AppRouter()
  public init() {}
  public var body: some View {
    Group {
      switch router.current {
      case .home: HomePageView()
      }
    }
    .environmentObject(router)
  }
}
