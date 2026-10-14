// Semper pour Mac : une fenêtre native autour de https://trysemper.app
import AppKit
import WebKit
import Network

let homeURL = URL(string: "https://trysemper.app/aujourdhui")!
let semperHost = "trysemper.app"
let appVersion = "1.1"

// Seul trysemper.app s'affiche dans la fenêtre : aucun sous-domaine n'est servi.
func isSemper(_ url: URL?) -> Bool {
    url?.scheme?.lowercased() == "https" && url?.host?.lowercased() == semperHost
}

// Ce qui peut sortir de la fenêtre : les sites web et les e-mails. Jamais un fichier local ni un schéma système.
func canOpenOutside(_ url: URL) -> Bool {
    ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "")
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

// L'ouverture : l'anneau de Semper se dessine au centre, un point or en tête du trait, puis tout s'efface
// sur la page, chargée pendant ce temps. Même géométrie que app/brand.ts (grille 100 × 100).
final class SplashView: NSView {
    private static let SY: CGFloat = 0.65, RO: CGFloat = 42, W: CGFloat = 15, A0: CGFloat = 30, A1: CGFloat = 330
    private static let CY: CGFloat = 50 - 9.4 * SY
    // La grille du logo a y vers le bas, AppKit vers le haut : on retourne y.
    private static func pt(_ r: CGFloat, _ a: CGFloat) -> CGPoint {
        let t = a * .pi / 180
        return CGPoint(x: 50 + r * sin(t), y: 100 - (CY - r * cos(t) * SY))
    }
    private static func wa(_ a: CGFloat) -> CGFloat {
        a < A0 || a > A1 ? 0 : W * pow(sin(.pi * (a - A0) / (A1 - A0)), 0.9)
    }

    private let ring = CALayer()          // l'anneau, centré et mis à l'échelle
    private let shape = CAShapeLayer()    // l'anneau plein
    private let reveal = CAShapeLayer()   // le trait qui avance et le découvre
    private let head = CAShapeLayer()     // le point or, en tête du trait
    private var drawn = false, ready = false, leaving = false
    private let still = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion

    override init(frame: NSRect) {
        super.init(frame: frame)
        let dark = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        let paper = dark ? CGColor(srgbRed: 14 / 255, green: 14 / 255, blue: 14 / 255, alpha: 1) : CGColor(srgbRed: 245 / 255, green: 245 / 255, blue: 245 / 255, alpha: 1)
        let ink = dark ? CGColor(srgbRed: 245 / 255, green: 245 / 255, blue: 245 / 255, alpha: 1) : CGColor(srgbRed: 14 / 255, green: 14 / 255, blue: 14 / 255, alpha: 1)
        wantsLayer = true
        layer?.backgroundColor = paper

        let outline = CGMutablePath(), center = CGMutablePath()
        var inner: [CGPoint] = []
        let n = 160
        for k in 0...n {
            let a = Self.A0 + (Self.A1 - Self.A0) * CGFloat(k) / CGFloat(n)
            let o = Self.pt(Self.RO, a)
            if k == 0 { outline.move(to: o) } else { outline.addLine(to: o) }
            inner.append(Self.pt(Self.RO - Self.wa(a), a))
            let c = Self.pt(Self.RO - Self.wa(a) / 2, a)
            if k == 0 { center.move(to: c) } else { center.addLine(to: c) }
        }
        inner.reversed().forEach { outline.addLine(to: $0) }
        outline.closeSubpath()

        ring.bounds = CGRect(x: 0, y: 0, width: 100, height: 100)
        // Le centre visible du symbole (boîte 8 → 92 en x, 20,25 → 71,19 en y dans la grille).
        ring.anchorPoint = CGPoint(x: 0.5, y: (100 - 45.72) / 100)
        shape.path = outline
        shape.fillColor = ink
        reveal.path = center
        reveal.fillColor = nil
        reveal.strokeColor = ink
        reveal.lineWidth = Self.W + 3
        reveal.lineCap = .round
        reveal.strokeEnd = still ? 1 : 0
        shape.mask = reveal
        head.path = CGPath(ellipseIn: CGRect(x: -2.3, y: -2.3, width: 4.6, height: 4.6), transform: nil)
        head.fillColor = CGColor(srgbRed: 1, green: 197 / 255, blue: 8 / 255, alpha: 1)
        head.position = Self.pt(Self.RO, Self.A0)
        head.opacity = 0
        ring.addSublayer(shape)
        ring.addSublayer(head)
        layer?.addSublayer(ring)
        place()
    }

    required init?(coder: NSCoder) { fatalError() }

    override func layout() {
        super.layout()
        place()
    }

    // L'anneau fait le quart de la largeur de la fenêtre, entre 150 et 260 points.
    private func place() {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        let s = min(260, max(150, bounds.width / 4)) / 84
        ring.position = CGPoint(x: bounds.midX, y: bounds.midY)
        ring.transform = CATransform3DMakeScale(s, s, 1)
        CATransaction.commit()
    }

    func start() {
        let ease = CAMediaTimingFunction(controlPoints: 0.65, 0, 0.35, 1)
        let delay = CACurrentMediaTime() + 0.15, dur = 1.05
        if !still {
            let grow = CABasicAnimation(keyPath: "strokeEnd")
            grow.fromValue = 0; grow.toValue = 1
            grow.beginTime = delay; grow.duration = dur; grow.timingFunction = ease
            grow.fillMode = .both; grow.isRemovedOnCompletion = false
            reveal.add(grow, forKey: "grow")

            let path = (reveal.path)!
            let move = CAKeyframeAnimation(keyPath: "position")
            move.path = path; move.calculationMode = .paced
            move.beginTime = delay; move.duration = dur; move.timingFunction = ease
            move.fillMode = .both; move.isRemovedOnCompletion = false
            head.add(move, forKey: "move")

            let glow = CAKeyframeAnimation(keyPath: "opacity")
            glow.values = [0, 1, 1, 0]; glow.keyTimes = [0, 0.08, 0.85, 1]
            glow.beginTime = delay; glow.duration = dur + 0.25
            glow.fillMode = .both; glow.isRemovedOnCompletion = false
            head.add(glow, forKey: "glow")
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + (still ? 0.3 : 0.15 + dur + 0.35)) { [weak self] in
            self?.drawn = true
            self?.leave()
        }
        // Jamais bloqué derrière l'ouverture : au bout de 8 secondes, on laisse voir la page.
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in self?.pageReady() }
    }

    func pageReady() {
        ready = true
        leave()
    }

    // La sortie : l'anneau s'agrandit et s'efface, le papier s'efface juste après, la page apparaît.
    private func leave() {
        guard drawn, ready, !leaving else { return }
        leaving = true
        let out = CAMediaTimingFunction(controlPoints: 0.5, 0, 0.75, 0)
        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in self?.removeFromSuperview() }
        let zoom = CABasicAnimation(keyPath: "transform.scale")
        zoom.byValue = 0.35; zoom.duration = 0.5; zoom.timingFunction = out
        zoom.fillMode = .forwards; zoom.isRemovedOnCompletion = false
        ring.add(zoom, forKey: "zoom")
        let fade = CABasicAnimation(keyPath: "opacity")
        fade.toValue = 0; fade.duration = 0.4; fade.timingFunction = out
        fade.fillMode = .forwards; fade.isRemovedOnCompletion = false
        ring.add(fade, forKey: "fade")
        let paper = CABasicAnimation(keyPath: "opacity")
        paper.toValue = 0; paper.beginTime = CACurrentMediaTime() + 0.15; paper.duration = 0.45
        paper.fillMode = .both; paper.isRemovedOnCompletion = false
        layer?.add(paper, forKey: "paper")
        CATransaction.commit()
    }

    // Pendant l'ouverture, les clics ne passent pas à la page.
    override func hitTest(_ point: NSPoint) -> NSView? { leaving ? nil : self }
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
    var quitting = false
    var splash: SplashView?

    // MARK: Lancement

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.applicationNameForUserAgent = "SemperMac/\(appVersion)"
        // window.open passe toujours par createWebViewWith, même hors clic (le CRM ouvre Instagram après une copie).
        // Aucune seconde fenêtre ne s'ouvre : c'est createWebViewWith qui décide où va le lien.
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
        let s = SplashView(frame: container.bounds)
        s.autoresizingMask = [.width, .height]
        container.addSubview(s)
        splash = s

        webView.load(URLRequest(url: homeURL))
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        s.start()

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

    // Fermer = cacher la fenêtre. La page envoie d'abord ce qui attend (elle reste ouverte derrière).
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        flushPage()
        sender.orderOut(nil)
        return false
    }

    // Quitter : la page envoie ce qui attend, puis 300 ms pour que les écritures partent avant la fin.
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if quitting || webView == nil { return .terminateNow }
        quitting = true
        flushPage()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            NSApp.reply(toApplicationShouldTerminate: true)
        }
        return .terminateLater
    }

    // store.ts envoie tout en keepalive sur pagehide. Pas de visibilitychange : la page est encore visible
    // à ce moment-là et le prendrait pour un retour.
    func flushPage() {
        webView?.evaluateJavaScript("dispatchEvent(new Event('pagehide'))", completionHandler: nil)
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
            decisionHandler(.cancel)
            return
        }
        if isSemper(url) || scheme == "about" || scheme == "blob" {
            decisionHandler(.allow)
            return
        }
        // Le reste ne s'affiche jamais dans la fenêtre. Un autre site ou un e-mail demandé par la page
        // s'ouvre dans le navigateur ou l'app Mail, clic ou pas (le CRM écrit l'e-mail par location.href).
        // Fichiers locaux, réglages et autres schémas système : refusés.
        if (action.targetFrame?.isMainFrame ?? true) && canOpenOutside(url) {
            openExternally(url)
        }
        decisionHandler(.cancel)
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
        splash?.pageReady()
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
        splash?.pageReady()
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
        // Nouvel onglet : un autre site ou un e-mail s'ouvre dans le navigateur ou l'app Mail, clic ou pas.
        // Un lien Semper cliqué aussi : la page en cours reste (une inscription ne se perd pas en lisant
        // les conditions). Un window.open vers Semper sans clic se charge dans la fenêtre.
        guard let url = action.request.url else { return nil }
        if isSemper(url) && action.navigationType != .linkActivated {
            webView.load(action.request)
        } else if canOpenOutside(url) {
            openExternally(url)
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
