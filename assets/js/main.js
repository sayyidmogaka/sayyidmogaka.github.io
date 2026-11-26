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

    initHomepageDoodles();
});

function initHomepageDoodles() {
    const homePage = document.querySelector("[data-home-page]");
    if (!homePage) return;

    const canvas = document.createElement("canvas");
    canvas.className = "doodle-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    const context = canvas.getContext("2d");
    if (!context) return;

    const ink = "rgba(65, 108, 157, 0.56)";
    let pixelRatio = 1;
    let isDrawing = false;
    let lastPoint = null;

    function prepareContext() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(window.innerWidth * pixelRatio);
        canvas.height = Math.round(window.innerHeight * pixelRatio);
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.lineCap = "round";
        context.lineJoin = "round";
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
        const scale = Math.min(1, Math.max(.58, w / 1250));
        if (w < 560) {
            star(w * .12, h * .22, .65);
            star(w * .88, h * .34, .65);
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

    document.addEventListener("pointerdown", (event) => {
        if (!["mouse", "pen"].includes(event.pointerType) || event.button !== 0) return;
        if (isInteractiveTarget(event.target)) return;
        isDrawing = true;
        lastPoint = [event.clientX, event.clientY];
        context.beginPath();
        context.moveTo(lastPoint[0], lastPoint[1]);
        context.lineWidth = 4;
        context.strokeStyle = ink;
        context.lineCap = "round";
        context.lineJoin = "round";
        event.preventDefault();
    }, { passive: false });

    document.addEventListener("pointermove", (event) => {
        if (!isDrawing || !lastPoint) return;
        context.lineTo(event.clientX, event.clientY);
        context.stroke();
        lastPoint = [event.clientX, event.clientY];
    });

    function stopDrawing() {
        isDrawing = false;
        lastPoint = null;
    }
    document.addEventListener("pointerup", stopDrawing);
    document.addEventListener("pointercancel", stopDrawing);
    window.addEventListener("blur", stopDrawing);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "doodle-clear";
    clearButton.title = "Clear drawings";
    clearButton.setAttribute("aria-label", "Clear drawings");
    clearButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h7V4l-2.35 2.35Z"/></svg>';
    clearButton.addEventListener("click", () => {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        drawDecorations();
    });
    document.body.appendChild(clearButton);

    window.addEventListener("resize", prepareContext, { passive: true });
    prepareContext();
}
