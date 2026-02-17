import UIKit
import WebKit
import Capacitor

class SafariTrackViewController: CAPBridgeViewController {

    override func webViewConfiguration(for config: InstanceConfiguration) -> WKWebViewConfiguration {
        let webConfig = super.webViewConfiguration(for: config)
        webConfig.allowsInlineMediaPlayback = true
        return webConfig
    }

    override func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        super.webView(webView, didFail: navigation, withError: error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}
