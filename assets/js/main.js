document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".year").forEach((element) => {
        element.textContent = new Date().getFullYear();
    });

    const menuButton = document.querySelector(".toggle");
    const siteWrap = document.querySelector(".wrap");
    if (menuButton && siteWrap) {
        menuButton.addEventListener("click", () => {
            const isOpen = siteWrap.classList.toggle("menu-open");
            menuButton.setAttribute("aria-expanded", String(isOpen));
        });
    }

    initThemeToggle();
    initHomepageDoodles();
});

function initHomepageDoodles() {
    // The ink layer belongs exclusively to the homepage landing cover.
    const homePage = document.querySelector("main[data-home-page]");
    if (!homePage) return;

    const canvas = document.createElement("canvas");
    canvas.className = "doodle-canvas";
    canvas.dataset.homepageOnly = "true";
    canvas.setAttribute("aria-hidden", "true");
    homePage.appendChild(canvas);

    const context = canvas.getContext("2d");
    if (!context) return;

    // Keep decorations on the permanent canvas and handwriting on its own
    // transparent canvas so that only visitors' strokes fade.
    const drawingCanvas = document.createElement("canvas");
    drawingCanvas.className = "doodle-canvas doodle-ink";
    drawingCanvas.dataset.homepageOnly = "true";
    drawingCanvas.setAttribute("aria-hidden", "true");
    homePage.appendChild(drawingCanvas);
    const drawingContext = drawingCanvas.getContext("2d");
    if (!drawingContext) {
        drawingCanvas.remove();
        return;
    }

    const ink = "rgba(100, 155, 215, 0.65)";
    const fadeDurationMs = 3200; // end each fade with a complete erase
    const fadePerFrame = 0.022;
    let pixelRatio = 1;
    let isDrawing = false;
    let lastPoint = null;
    let lastFrame = null;
    let fadeStartedAt = null;

    function prepareContext() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = homePage.clientWidth;
        const height = homePage.clientHeight;
        for (const layer of [canvas, drawingCanvas]) {
            layer.width = Math.round(width * pixelRatio);
            layer.height = Math.round(height * pixelRatio);
            layer.style.width = "100%";
            layer.style.height = "100%";
        }
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.lineCap = "round";
        context.lineJoin = "round";
        drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawingContext.lineCap = "round";
        drawingContext.lineJoin = "round";
        fadeStartedAt = null;
        drawDecorations();
    }

    function path(points, width = 3.5) {
        if (!points.length) return;
        context.beginPath();
        context.lineWidth = width;
        context.strokeStyle = ink;
        context.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i][0], points[i][1]);
        }
        context.stroke();
    }

    function star(x, y, scale = 1) {
        const points = [];
        for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + (Math.PI * i / 5);
            const radius = (i % 2 === 0 ? 15 : 6.5) * scale;
            points.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
        }
        points.push(points[0]);
        path(points, 3.4);
    }

    function rocket(x, y, scale = 1) {
        const s = scale;
        path([[x, y - 22*s], [x + 7*s, y - 10*s], [x + 7*s, y + 12*s],
              [x, y + 18*s], [x - 7*s, y + 12*s], [x - 7*s, y - 10*s],
              [x, y - 22*s]], 3.3);
        path([[x - 7*s, y + 5*s], [x - 15*s, y + 18*s], [x - 6*s, y + 12*s]], 3.3);
        path([[x + 7*s, y + 5*s], [x + 15*s, y + 18*s], [x + 6*s, y + 12*s]], 3.3);
        path([[x - 3*s, y + 19*s], [x, y + 28*s], [x + 3*s, y + 19*s]], 2.8);
    }

    function stickFigure(x, y, scale = 1) {
        const s = scale;
        context.beginPath();
        context.lineWidth = 3.4;
        context.strokeStyle = ink;
        context.arc(x, y - 17*s, 7*s, 0, Math.PI * 2);
        context.stroke();
        path([[x, y - 9*s], [x, y + 12*s],
              [x - 11*s, y + 23*s], [x, y + 12*s], [x + 11*s, y + 23*s]], 3.4);
        path([[x - 14*s, y - 3*s], [x, y + 2*s], [x + 14*s, y - 3*s]], 3.4);
    }

    function smiley(x, y, scale = 1) {
        context.beginPath();
        context.lineWidth = 3.4;
        context.strokeStyle = ink;
        context.arc(x, y, 19*scale, 0, Math.PI*2);
        context.stroke();
        context.beginPath();
        context.fillStyle = ink;
        context.arc(x - 7*scale, y - 5*scale, 2.8*scale, 0, Math.PI*2);
        context.arc(x + 7*scale, y - 5*scale, 2.8*scale, 0, Math.PI*2);
        context.fill();
        context.beginPath();
        context.lineWidth = 3;
        context.arc(x, y + 1*scale, 10*scale, .18, Math.PI - .18);
        context.stroke();
    }

    function drawDecorations() {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scale = Math.min(1, Math.max(.48, w / 1250));
        if (w < 560) {
            star(w * .10, h * .16, .55);
            star(w * .90, h * .24, .55);
            rocket(w * .08, h * .72, .55);
            stickFigure(w * .91, h * .78, .55);
            return;
        }
        star(w * .10, h * .27, scale);
        star(w * .15, h * .12, .85 * scale);
        rocket(w * .055, h * .63, .9 * scale);
        stickFigure(w * .08, h * .86, .9 * scale);
        star(w * .90, h * .25, scale);
        smiley(w * .85, h * .53, .9 * scale);
        rocket(w * .93, h * .78, .9 * scale);
        stickFigure(w * .85, h * .10, .85 * scale);
    }

    function isInteractiveTarget(target) {
        return Boolean(target.closest("a, button, input, textarea, select, summary, [role='button'], .doodle-clear"));
    }

    function canvasPoint(event) {
        const bounds = homePage.getBoundingClientRect();
        return [event.clientX - bounds.left, event.clientY - bounds.top];
    }

    document.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 && event.pointerType !== "touch") return;
        if (!homePage.contains(event.target) || isInteractiveTarget(event.target)) return;
        // Preserve normal navigation; only intercept interaction on the homepage.
        isDrawing = true;
        fadeStartedAt = null;
        lastPoint = canvasPoint(event);
        drawingContext.beginPath();
        drawingContext.moveTo(...lastPoint);
        drawingContext.lineWidth = 4;
        drawingContext.strokeStyle = ink;
        if (event.cancelable) event.preventDefault();
    }, { passive: false });

    document.addEventListener("pointermove", (event) => {
        if (!isDrawing || !lastPoint) return;
        const point = canvasPoint(event);
        drawingContext.lineTo(...point);
        drawingContext.stroke();
        lastPoint = point;
        if (event.pointerType === "touch" && event.cancelable) event.preventDefault();
    }, { passive: false });

    function stopDrawing() {
        if (isDrawing) fadeStartedAt = performance.now();
        isDrawing = false;
        lastPoint = null;
    }
    document.addEventListener("pointerup", stopDrawing);
    document.addEventListener("pointercancel", stopDrawing);
    window.addEventListener("blur", stopDrawing);

    // A destination-out fade alone approaches zero opacity asymptotically.
    // Give handwriting a finite lifetime, then erase every remaining pixel.
    // The permanent decorations live on a different canvas and are untouched.
    function fadeDrawing(frameTime) {
        const elapsed = lastFrame === null ? 16.67 : Math.max(0, Math.min(frameTime - lastFrame, 100));
        lastFrame = frameTime;
        if (!isDrawing && fadeStartedAt !== null) {
            if (frameTime - fadeStartedAt >= fadeDurationMs) {
                drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                fadeStartedAt = null;
            } else if (elapsed > 0) {
                const opacity = 1 - Math.pow(1 - fadePerFrame, elapsed / 16.67);
                drawingContext.save();
                drawingContext.setTransform(1, 0, 0, 1, 0, 0);
                drawingContext.globalCompositeOperation = "destination-out";
                drawingContext.fillStyle = `rgba(0, 0, 0, ${opacity})`;
                drawingContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                drawingContext.restore();
            }
        }
        requestAnimationFrame(fadeDrawing);
    }

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "doodle-clear";
    clearButton.title = "Clear drawings";
    clearButton.setAttribute("aria-label", "Clear drawings");
    clearButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h7V4l-2.35 2.35Z"/></svg>';
    clearButton.addEventListener("click", () => {
        fadeStartedAt = null;
        drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawDecorations();
    });
    homePage.appendChild(clearButton);

    window.addEventListener("resize", prepareContext, { passive: true });
    prepareContext();
    requestAnimationFrame(fadeDrawing);
}

function initThemeToggle() {
    const root = document.documentElement;
    const buttons = document.querySelectorAll(".theme-toggle");
    function apply(theme) {
        root.dataset.theme = theme;
        buttons.forEach(button => {
            const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
            button.setAttribute("aria-label", label);
            button.title = label;
            button.setAttribute("aria-pressed", String(theme === "dark"));
        });
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === "dark" ? "#141b24" : "#d8d5cd";
    }
    apply(root.dataset.theme === "dark" ? "dark" : "light");
    buttons.forEach(button => button.addEventListener("click", () => {
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        try { localStorage.setItem("portfolio-theme", next); } catch (_) {}
        apply(next);
    }));
    window.addEventListener("storage", event => {
        if (event.key === "portfolio-theme") apply(event.newValue === "dark" ? "dark" : "light");
    });
}
