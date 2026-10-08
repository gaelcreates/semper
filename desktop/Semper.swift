// Semper pour Mac : une fenêtre native autour de https://trysemper.app
import AppKit
import WebKit
import Network

let homeURL = URL(string: "https://trysemper.app/calendrier")!
let semperHost = "trysemper.app"
let appVersion = "1.0"

func isSemper(_ url: URL?) -> Bool {
    guard let host = url?.host?.lowercased() else { return false }
    return host == semperHost || host.hasSuffix("." + semperHost)
}

func openExternally(_ url: URL) {
    NSWorkspace.shared.open(url)
}

// Vue affichée quand la page ne charge pas (hors ligne)
final class OfflineView: NSView {
    let button = NSButton(title: "Réessayer", target: nil, action: nil)

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.backgroundColor = NSColor(srgbRed: 0xf5 / 255, green: 0xf5 / 255, blue: 0xf5 / 255, alpha: 1).cgColor

        let label = NSTextField(wrappingLabelWithString: "Pas de connexion. Semper se recharge dès que tu es en ligne.")
        label.alignment = .center
        label.font = .systemFont(ofSize: 15)
        label.textColor = NSColor(srgbRed: 0.2, green: 0.2, blue: 0.2, alpha: 1)
        button.bezelStyle = .rounded
        button.keyEquivalent = "\r"

        let stack = NSStackView(views: [label, button])
        stack.orientation = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: centerYAnchor),
            label.widthAnchor.constraint(lessThanOrEqualToConstant: 420),
        ])
    }

    required init?(coder: NSCoder) { fatalError() }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate,
    WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate
{
    var window: NSWindow!
    var webView: WKWebView!
    var offlineView: OfflineView!
    let monitor = NWPathMonitor()
    var failedURL: URL?
    var downloadDestinations: [ObjectIdentifier: URL] = [:]

    // MARK: Lancement

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.applicationNameForUserAgent = "SemperMac/\(appVersion)"
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsMagnification = true
        webView.setValue(false, forKey: "drawsBackground")
        webView.autoresizingMask = [.width, .height]

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.title = "Semper"
        window.minSize = NSSize(width: 900, height: 600)
        window.backgroundColor = NSColor(srgbRed: 0xf5 / 255, green: 0xf5 / 255, blue: 0xf5 / 255, alpha: 1)
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.tabbingMode = .disallowed
        window.center()
        window.setFrameAutosaveName("SemperMainWindow")

        let container = NSView(frame: window.contentLayoutRect)
        webView.frame = container.bounds
        container.addSubview(webView)
        offlineView = OfflineView(frame: container.bounds)
        offlineView.autoresizingMask = [.width, .height]
        offlineView.button.target = self
        offlineView.button.action = #selector(retry)
        offlineView.isHidden = true
        container.addSubview(offlineView)
        window.contentView = container

        webView.load(URLRequest(url: homeURL))
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // Recharge automatique au retour du réseau
        monitor.pathUpdateHandler = { [weak self] path in
            guard path.status == .satisfied else { return }
            DispatchQueue.main.async {
                guard let self, !self.offlineView.isHidden else { return }
                self.retry()
            }
        }
        monitor.start(queue: DispatchQueue(label: "semper.network"))
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window.makeKeyAndOrderFront(nil)
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    // Fermer = cacher la fenêtre
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        return false
    }

    // MARK: Menus

    func buildMenu() {
        let main = NSMenu()

        func item(_ title: String, _ action: Selector?, _ key: String = "", _ mods: NSEvent.ModifierFlags = .command, target: AnyObject? = nil) -> NSMenuItem {
            let i = NSMenuItem(title: title, action: action, keyEquivalent: key)
            i.keyEquivalentModifierMask = mods
            i.target = target
            return i
        }
        func submenu(_ title: String, _ items: [NSMenuItem]) -> NSMenu {
            let m = NSMenu(title: title)
            items.forEach { m.addItem($0) }
            let holder = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            holder.submenu = m
            main.addItem(holder)
            return m
        }

        _ = submenu("Semper", [
            item("À propos de Semper", #selector(showAbout), target: self),
            .separator(),
            item("Masquer Semper", #selector(NSApplication.hide(_:)), "h"),
            item("Masquer les autres", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]),
            item("Tout afficher", #selector(NSApplication.unhideAllApplications(_:))),
            .separator(),
            item("Quitter Semper", #selector(NSApplication.terminate(_:)), "q"),
        ])

        _ = submenu("Édition", [
            item("Annuler", Selector(("undo:")), "z"),
            item("Rétablir", Selector(("redo:")), "z", [.command, .shift]),
            .separator(),
            item("Couper", #selector(NSText.cut(_:)), "x"),
            item("Copier", #selector(NSText.copy(_:)), "c"),
            item("Coller", #selector(NSText.paste(_:)), "v"),
            item("Tout sélectionner", #selector(NSText.selectAll(_:)), "a"),
        ])

        _ = submenu("Présentation", [
            item("Recharger", #selector(reloadPage), "r", target: self),
            .separator(),
            item("Taille réelle", #selector(zoomReset), "0", target: self),
            item("Zoom avant", #selector(zoomIn), "=", target: self),
            item("Zoom arrière", #selector(zoomOut), "-", target: self),
            .separator(),
            item("Plein écran", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control]),
        ])

        _ = submenu("Navigation", [
            item("Précédent", #selector(goBack), "[", target: self),
            item("Suivant", #selector(goForward), "]", target: self),
        ])

        let windowMenu = submenu("Fenêtre", [
            item("Fermer", #selector(NSWindow.performClose(_:)), "w"),
            item("Réduire", #selector(NSWindow.performMiniaturize(_:)), "m"),
            item("Zoom", #selector(NSWindow.performZoom(_:))),
            .separator(),
            item("Tout ramener au premier plan", #selector(NSApplication.arrangeInFront(_:))),
        ])

        NSApp.mainMenu = main
        NSApp.windowsMenu = windowMenu
    }

    @objc func showAbout() {
        NSApp.orderFrontStandardAboutPanel(options: [
            .applicationName: "Semper",
            .applicationVersion: appVersion,
            .version: "",
        ])
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc func reloadPage() {
        if !offlineView.isHidden { retry() } else { webView.reload() }
    }
    @objc func zoomReset() { webView.pageZoom = 1 }
    @objc func zoomIn() { webView.pageZoom = min(webView.pageZoom + 0.1, 3) }
    @objc func zoomOut() { webView.pageZoom = max(webView.pageZoom - 0.1, 0.5) }
    @objc func goBack() { webView.goBack() }
    @objc func goForward() { webView.goForward() }

    @objc func retry() {
        webView.load(URLRequest(url: failedURL ?? webView.url ?? homeURL))
    }

    // MARK: Navigation

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void)
    {
        if action.shouldPerformDownload {
            decisionHandler(.download)
            return
        }
        guard let url = action.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.allow)
            return
        }
        switch scheme {
        case "http", "https":
            // Les autres sites s'ouvrent dans le navigateur (les iframes restent dans la page)
            let isMainFrame = action.targetFrame?.isMainFrame ?? true
            if isMainFrame && !isSemper(url) {
                openExternally(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        case "about", "blob", "data", "file":
            decisionHandler(.allow)
        default:
            // mailto:, tel:, etc.
            openExternally(url)
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void)
    {
        var attachment = false
        if let http = response.response as? HTTPURLResponse,
           let disposition = http.value(forHTTPHeaderField: "Content-Disposition")?.lowercased(),
           disposition.hasPrefix("attachment")
        {
            attachment = true
        }
        decisionHandler(attachment || !response.canShowMIMEType ? .download : .allow)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        offlineView.isHidden = true
        failedURL = nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handleLoadError(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handleLoadError(error)
    }

    func handleLoadError(_ error: Error) {
        let e = error as NSError
        // Annulations et téléchargements : pas une vraie erreur
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return }
        if e.domain == "WebKitErrorDomain" && (e.code == 102 || e.code == 204) { return }
        guard e.domain == NSURLErrorDomain else { return }
        failedURL = (e.userInfo[NSURLErrorFailingURLErrorKey] as? URL) ?? webView.url
        if let u = failedURL, !isSemper(u) { failedURL = homeURL }
        offlineView.isHidden = false
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    // MARK: Fenêtres, fichiers, alertes

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView?
    {
        if let url = action.request.url {
            if isSemper(url) || ["blob", "data"].contains(url.scheme?.lowercased() ?? "") {
                webView.load(action.request)
            } else if url.scheme != nil && url.absoluteString != "about:blank" {
                openExternally(url)
            }
        }
        return nil
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void)
    {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = parameters.allowsDirectories
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.beginSheetModal(for: window) { result in
            completionHandler(result == .OK ? panel.urls : nil)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void)
    {
        let alert = NSAlert()
        alert.messageText = "Semper"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void)
    {
        let alert = NSAlert()
        alert.messageText = "Semper"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Annuler")
        alert.beginSheetModal(for: window) { r in completionHandler(r == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void)
    {
        let alert = NSAlert()
        alert.messageText = "Semper"
        alert.informativeText = prompt
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.stringValue = defaultText ?? ""
        alert.accessoryView = field
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Annuler")
        alert.beginSheetModal(for: window) { r in
            completionHandler(r == .alertFirstButtonReturn ? field.stringValue : nil)
        }
    }

    // MARK: Téléchargements

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void)
    {
        let folder = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        let name = suggestedFilename.isEmpty ? "Semper" : suggestedFilename
        let base = (name as NSString).deletingPathExtension
        let ext = (name as NSString).pathExtension
        var dest = folder.appendingPathComponent(name)
        var n = 2
        while FileManager.default.fileExists(atPath: dest.path) {
            let candidate = ext.isEmpty ? "\(base) \(n)" : "\(base) \(n).\(ext)"
            dest = folder.appendingPathComponent(candidate)
            n += 1
        }
        downloadDestinations[ObjectIdentifier(download)] = dest
        completionHandler(dest)
    }

    func downloadDidFinish(_ download: WKDownload) {
        if let dest = downloadDestinations.removeValue(forKey: ObjectIdentifier(download)) {
            NSWorkspace.shared.activateFileViewerSelecting([dest])
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadDestinations.removeValue(forKey: ObjectIdentifier(download))
        let alert = NSAlert()
        alert.messageText = "Le téléchargement a échoué."
        alert.informativeText = error.localizedDescription
        alert.beginSheetModal(for: window, completionHandler: nil)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
