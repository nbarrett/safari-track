import UIKit
import WebKit
import Capacitor

class SafariTrackViewController: CAPBridgeViewController {

    override func webViewConfiguration(for config: InstanceConfiguration) -> WKWebViewConfiguration {
        let webConfig = super.webViewConfiguration(for: config)
        webConfig.allowsInlineMediaPlayback = true
        return webConfig
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}
