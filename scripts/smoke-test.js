const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
    if (msg.type() === "warning") warnings.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  const base = "http://localhost:3000";

  try {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    console.log(
      "Login inicial (input presente):",
      (await page.locator('input[name="password"]').count()) === 1
    );
    console.log(
      "Frase críptica rotativa presente:",
      (await page.locator("h1.font-pixel").count()) === 1
    );

    // Login incorrecto → el ojo mira de frente, flash CRT y negro absoluto
    await page.fill('input[name="password"]', "clave-equivocada");
    await page.click('button[type="submit"]');
    await page.waitForSelector("div.fixed.inset-0.z-50.bg-black", {
      timeout: 12000,
    });
    console.log("Apagado CRT (negro absoluto) tras clave errónea: yes");
    console.log(
      "Input ya no existe (hay que refrescar):",
      (await page.locator('input[name="password"]').count()) === 0
    );

    // Reintentar = refrescar la página
    await page.goto(base + "/", { waitUntil: "networkidle" });
    console.log(
      "Tras refrescar, el login vuelve:",
      (await page.locator('input[name="password"]').count()) === 1
    );

    await page.fill('input[name="password"]', "bitakra");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/bitacora/**", { timeout: 15000 });
    const todayUrl = page.url();
    console.log("URL tras login:", todayUrl);
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    const todayIso = iso(new Date());

    // HUD: deck, reloj, LED / ticker presente
    await page.waitForSelector(".cyb-deck", { timeout: 15000 });
    console.log("Header HUD (.cyb-deck): yes");
    console.log("Reloj dual (HH:MM):", /^\d{2}:\d{2}/.test(await page.locator(".cyb-clock").innerText()));
    console.log("Led SYS.OK:", (await page.locator(".cyb-tags .led").count()) >= 1);
    console.log("Ticker eliminado:", (await page.locator(".cyb-ticker").count()) === 0);

    await page.waitForSelector("h2:has-text('Objetivos')", { timeout: 15000 });
    console.log("Card 'Objetivos' en vista día: yes");

    // 0) Calendario: año arriba (NUEVO), mes abajo, grilla de días
    console.log(
      "Control de año presente arriba del mes:",
      (await page.locator('button[aria-label="Año anterior"]').count()) === 1
    );
    const yearText = async () => page.locator("nav .cal-btn + span").first().innerText();
    const yearBefore = await yearText();
    await page.locator('button[aria-label="Año siguiente"]').click();
    await page.waitForTimeout(200);
    const yearAfter = await yearText();
    console.log(
      "Botón de año cambia el año:",
      Number(yearAfter) === Number(yearBefore) + 1
    );
    await page.locator('button[aria-label="Año anterior"]').click();
    await page.waitForTimeout(200);
    console.log(
      "Grilla de 7 columnas de días sigue presente:",
      (await page.locator(".cyb-cal-hd").count()) >= 7
    );

    // Frase motivacional: recuadro .blk con cita glitch + autor con rol + botón refrescar
    const quoteBoxes = page.locator("blockquote");
    console.log("Recuadros de frase:", await quoteBoxes.count());
    const quoteText = await quoteBoxes.first().innerText();
    console.log("Cita entre comillas «»:", quoteText.includes("«"));
    console.log("Glitch (data-text):", (await quoteBoxes.first().locator("p").first().getAttribute("data-text")) !== null);
    const getAuthorLine = (full) => full.split("\n").find((l) => l.startsWith("—"));
    console.log("Autor con guion:", Boolean(getAuthorLine(quoteText)));
    const refreshButton = page.locator("button[aria-label='Mostrar otra frase']");
    console.log("Botón 'Otra frase' presente:", (await refreshButton.count()) > 0);
    let sawRole = false;
    for (let i = 0; i < 8 && !sawRole; i++) {
      await refreshButton.click();
      await page.waitForTimeout(250);
      const author = getAuthorLine(await quoteBoxes.first().innerText());
      sawRole = Boolean(author && /,\s[\wáéíóúñ ]+$/.test(author));
    }
    console.log("Alguna cita muestra autor con rol:", sawRole);
    const beforeText = await quoteBoxes.first().locator("p.glitch").innerText();
    await refreshButton.click();
    await page.waitForTimeout(400);
    const afterText = await quoteBoxes.first().locator("p.glitch").innerText();
    console.log("La frase cambia al refrescar:", beforeText !== afterText);

    // 1) Objetivos con 3 estados: slots ✕ (rojo) / − (ámbar) / ✓ (verde) y %
    const firstObj = page.locator(".cyb-trio").first();
    console.log("Tres slots por objetivo:", (await firstObj.locator("button").count()) === 3);
    console.log(
      "Slots ✕ / − / ✓ presentes:",
      (await firstObj.locator('button[aria-label="Sin hacer"]').count()) === 1 &&
        (await firstObj.locator('button[aria-label="A medias"]').count()) === 1 &&
        (await firstObj.locator('button[aria-label="Completado"]').count()) === 1
    );
    const objHeader = page.locator("h2:has-text('Objetivos')").first();
    console.log(
      "Header dice 'Objetivos' con %:",
      /OBJETIVOS[\s\S]*%\s*$/i.test(await objHeader.innerText())
    );
    await firstObj.locator('button[aria-label="Completado"]').click();
    await page.waitForTimeout(1200);
    console.log(
      "Slot verde activo tras tocar:",
      (await firstObj.locator('button[aria-label="Completado"].active').count()) === 1
    );
    const donePct = await objHeader.innerText().then((t) => {
      const m = t.match(/(-?\s*\d+)%$/);
      return m ? parseInt(m[1], 10) : -1;
    });
    await firstObj.locator('button[aria-label="A medias"]').click();
    await page.waitForTimeout(800);
    console.log(
      "Slot ámbar activo tras tocar:",
      (await firstObj.locator('button[aria-label="A medias"].active').count()) === 1
    );
    const partialPct = await objHeader.innerText().then((t) => {
      const m = t.match(/(-?\s*\d+)%$/);
      return m ? parseInt(m[1], 10) : -1;
    });
    console.log(
      "− baja el % del día respecto a ✓:",
      donePct >= 0 && partialPct >= 0 && partialPct < donePct
    );
    await firstObj.locator('button[aria-label="Completado"]').click();
    await page.waitForTimeout(1200);
    console.log(
      "Se vuelve a completar (el día queda cumplido):",
      (await firstObj.locator('button[aria-label="Completado"].active').count()) === 1
    );
    const optimisticWarn = warnings.filter((w) =>
      w.includes("optimistic state update outside")
    );
    console.log("Warning optimista:", optimisticWarn.length ? "SIGUE HABIENDO" : "no");

    // 1b) Ignorar objetivo: segundo toque confirma y saca del denominador
    const headerCounts = async () => {
      const header = page.locator("h2:has-text('Objetivos')").first();
      const m = (await header.innerText()).match(/(\d+)\/(\d+) · (\d+)%$/);
      return m
        ? { done: parseInt(m[1], 10), total: parseInt(m[2], 10), pct: parseInt(m[3], 10) }
        : null;
    };
    const beforeIgnore = await headerCounts();
    const ignoreBtn = page.locator("button:has-text('ignorar')").first();
    await ignoreBtn.click();
    console.log(
      "Ignorar -> arma '¿Seguro?':",
      (await page.locator("button[aria-label^='Confirmar ignorar']").count()) === 1
    );
    await page.locator("button[aria-label='Cancelar ignorar objetivo']").click();
    await page.waitForTimeout(300);
    console.log(
      "Cancelar desarma (vuelve a 'ignorar'):",
      (await page.locator("button[aria-label^='Confirmar ignorar']").count()) === 0
    );
    await ignoreBtn.click();
    await page.locator("button[aria-label^='Confirmar ignorar']").click();
    await page.waitForTimeout(1200);
    const afterIgnore = await headerCounts();
    console.log(
      "Ignorar resta uno al denominador del header:",
      Boolean(
        beforeIgnore &&
          afterIgnore &&
          beforeIgnore.total >= 2 &&
          afterIgnore.total === beforeIgnore.total - 1
      )
    );
    console.log(
      "Fila queda atenuada ('ignorado · quitar'):",
      (await page.locator("button:has-text('ignorado · quitar')").count()) === 1
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("h2:has-text('Objetivos')", { timeout: 15000 });
    const afterReload = await headerCounts();
    console.log(
      "Ignorado persiste tras reload:",
      Boolean(
        beforeIgnore &&
          afterReload &&
          beforeIgnore.total >= 2 &&
          afterReload.total === beforeIgnore.total - 1
      )
    );
    await page.locator("button:has-text('ignorado · quitar')").click();
    await page.waitForTimeout(1200);
    const restored = await headerCounts();
    console.log(
      "Quitar ignorado restaura el total:",
      Boolean(
        beforeIgnore && restored && restored.total === beforeIgnore.total
      )
    );
    await firstObj.locator('button[aria-label="Completado"]').click();
    await page.waitForTimeout(800);

    // 2) Ajustes HUD: definir marcado por cantidad (>=1) y guardar
    await page.goto(base + "/bitacora/settings", { waitUntil: "networkidle" });
    await page.waitForSelector(".cyb-in", { timeout: 10000 });
    console.log("Formularios de Ajustes con input HUD: yes");
    await page.selectOption('select[name="mode"]', "count");
    await page.fill('input[name="threshold"]', "1");
    await page.click("button:has-text('Guardar ajustes')");
    await page.waitForSelector("text=Ajustes guardados.", { timeout: 10000 });
    console.log("Ajustes guardados (count>=1): yes");

    // 2b) Stack de notificaciones push eliminado: no hay sección ni botones
    console.log(
      "Sin sección Notificaciones_push:",
      (await page.locator("h2:has-text('Notificaciones_push')").count()) === 0
    );
    console.log(
      "Sin 'Activar notificaciones':",
      (await page.getByText("Activar notificaciones", { exact: false }).count()) === 0
    );

    // 3) Volver al día y verificar segmentos de colores (verde/amarillo/rojo)
    await page.goto(todayUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("h2:has-text('Objetivos')", { timeout: 15000 });
    console.log("Card 'Notas_del_día' (edificio N):", (await page.locator(".blk").count()) >= 4);
    const todayNum = new URL(todayUrl).pathname.split("/").pop().slice(-2);
    const todayCell = page.locator(`nav a:has-text('*${todayNum}')`).first();

    // 4) Notas
    const notesSection = page.locator("section", {
      has: page.getByRole("heading", { name: "Notas del día" }),
    });
    const noteText = "nota-" + Date.now();
    const textarea = notesSection.locator("textarea");
    await textarea.fill(noteText);
    await page.click("button:has-text('Agregar nota')");
    await page.waitForSelector(`text=${noteText}`, { timeout: 10000 });
    console.log("Nota acompañada encima del cuadro:", await page.locator(`text=${noteText}`).count() > 0);

    const note2 = noteText + "-2";
    await textarea.fill(note2);
    await page.click("button:has-text('Agregar nota')");
    await page.waitForSelector(`text=${note2}`, { timeout: 10000 });

    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll("button")].some((b) =>
          b.textContent.includes("Agregando")
        ),
      { timeout: 10000 }
    );

    const noteItems = notesSection.locator("li");
    const beforeCount = await noteItems.count();
    const firstNoteText = (await noteItems.first().innerText()).split("\n")[0].trim();

    await notesSection.locator("button:has-text('Eliminar')").first().click();
    await page.waitForTimeout(1500);
    const afterCount = await noteItems.count();
    console.log("Nota borrada (count -1):", afterCount === beforeCount - 1);
    console.log(
      "El texto borrado ya no está:",
      (await page.getByText(firstNoteText, { exact: true }).count()) === 0
    );

    await page.goto(todayUrl, { waitUntil: "networkidle" });
    console.log(
      "Nota persistida tras reload:",
      (await page.getByText(note2, { exact: true }).count()) > 0
    );

    // 5) Aprendizajes: limpiar, agregar y ver el segmento rojo (partición)
    const learnSection = page.locator("section", {
      has: page.getByRole("heading", { name: "Qué aprendí" }),
    });
    while ((await learnSection.locator("li").count()) > 0) {
      await learnSection.locator("button:has-text('Eliminar')").first().click();
      await page.waitForTimeout(700);
    }

    console.log(
      "Hoy sin aprendizaje -> verde+amarillo (sin rojo):",
      (await todayCell.locator("i.segs-g").count()) === 1 &&
        (await todayCell.locator("i.segs-a").count()) === 1 &&
        (await todayCell.locator("i.segs-r").count()) === 0
    );

    const learningText = "aprendi-" + Date.now();
    await learnSection.locator("textarea").fill(learningText);
    await page.click("button:has-text('Agregar aprendizaje')");
    await page.waitForSelector(`text=${learningText}`, { timeout: 10000 });
    await page.waitForFunction(
      (num) => {
        const link = [...document.querySelectorAll("nav a")].find((l) =>
          l.textContent.includes("*" + num)
        );
        return Boolean(link && link.querySelector("i.segs-r"));
      },
      todayNum,
      { timeout: 10000 }
    );
    console.log(
      "Hoy con aprendizaje -> 3 colores (verde/amarillo/rojo):",
      (await todayCell.locator("i.segs-g").count()) === 1 &&
        (await todayCell.locator("i.segs-a").count()) === 1 &&
        (await todayCell.locator("i.segs-r").count()) === 1
    );

    await page.goto(todayUrl, { waitUntil: "networkidle" });
    console.log(
      "Aprendizaje persistido tras reload:",
      (await page.getByText(learningText, { exact: true }).count()) > 0
    );

    await learnSection.locator("button:has-text('Eliminar')").first().click();
    await page.waitForFunction(
      (num) => {
        const link = [...document.querySelectorAll("nav a")].find((l) =>
          l.textContent.includes("*" + num)
        );
        return Boolean(link && link.querySelectorAll("i.segs-r").length === 0);
      },
      todayNum,
      { timeout: 10000 }
    );
    console.log(
      "Borrado aprendizaje -> vuelve a verde+amarillo:",
      (await todayCell.locator("i.segs-g").count()) === 1 &&
        (await todayCell.locator("i.segs-a").count()) === 1 &&
        (await todayCell.locator("i.segs-r").count()) === 0
    );

    // 5b) La Hoja: pensamientos del día (botón hoja en cabecera + cuaderno)
    await page.goto(todayUrl, { waitUntil: "networkidle" });
    const leafBtn = page.locator('button[aria-label="Abrir pensamientos del día"]');
    await leafBtn.waitFor({ timeout: 10000 });
    console.log("Botón hoja en la cabecera del día: yes");
    await leafBtn.click();
    const sheet = page.locator(".cyb-paper");
    await sheet.waitFor({ timeout: 10000 });
    console.log("Se abre el cuaderno blanco con renglones: yes");
    const sheetTextarea = sheet.locator("textarea");

    // Limpiar sobras de corridas anteriores (si el día quedó con texto)
    const prevSheet = (await sheetTextarea.inputValue()).trim();
    if (prevSheet) {
      await sheetTextarea.fill("");
      await page.waitForFunction(
        (iso) =>
          !document.querySelector(`nav a[href="/bitacora/${iso}"] .cyb-num i.segs-w`),
        todayIso,
        { timeout: 10000 }
      );
    }

    const pensoText = "penso-" + Date.now();
    await sheetTextarea.fill(pensoText);
    await page
      .locator(".paper-status", { hasText: "Guardado" })
      .waitFor({ timeout: 10000 });
    console.log("Autosave por pausa -> 'Guardado · hora': yes");

    // Tope blando (~20k caracteres) muestra el aviso de tinta
    await sheetTextarea.fill("x".repeat(20001));
    await page.locator(".paper-warn").waitFor({ timeout: 10000 });
    console.log("Tope blando: aviso de tinta aparece: yes");

    // Restaurar texto real, cerrar -> 4to segmento blanco en el calendario
    await sheetTextarea.fill(pensoText);
    await page
      .locator(".paper-status", { hasText: "Guardado" })
      .waitFor({ timeout: 10000 });
    await page.locator(".paper-shell button[aria-label='Cerrar']").click();
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num i.segs-w`,
      { timeout: 10000 }
    );
    console.log("4to segmento blanco (.segs-w) en el calendario: yes");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num i.segs-w`,
      { timeout: 10000 }
    );
    console.log("Segmento persiste tras reload: yes");
    await leafBtn.click();
    await sheet.waitFor({ timeout: 10000 });
    const loadedSheetText = (await sheetTextarea.inputValue()).trim();
    console.log(
      "El texto del pensamiento persiste en la hoja:",
      loadedSheetText === pensoText
    );

    // Limpiar la hoja -> la fila se borra y el segmento desaparece
    if (loadedSheetText !== pensoText) {
      await sheetTextarea.fill(pensoText);
      await page
        .locator(".paper-status", { hasText: "Guardado" })
        .waitFor({ timeout: 10000 });
    }
    await sheetTextarea.fill("");
    await page
      .locator(".paper-status", { hasText: "Guardado" })
      .waitFor({ timeout: 10000 });
    await page.locator(".paper-shell button[aria-label='Cerrar']").click();
    await page.waitForFunction(
      (iso) =>
        !document.querySelector(`nav a[href="/bitacora/${iso}"] .cyb-num i.segs-w`),
      todayIso,
      { timeout: 10000 }
    );
    console.log("Al vaciar la hoja, la fila se borra y el segmento desaparece: yes");

    // 6) Stats carga
    await page.click("a:has-text('Stats')");
    await page.waitForSelector("text=Estadísticas", { timeout: 10000 });
    console.log("Stats carga: yes");

    // 7) Chat de dinosaurios DESHABILITADO: sin dock ni panel
    console.log(
      "Chat de dinos deshabilitado (sin dock):",
      (await page.locator(".cyb-dock").count()) === 0
    );
    console.log(
      "Sin botón de abrir chat:",
      (await page.locator('button[aria-label="Abrir chat de dinosaurios"]').count()) === 0
    );

    // 7b) Resumen mensual con IA, justo debajo de los gráficos
    const monthBtn = page.locator("button:has-text('¿Cómo estuvo el mes?')");
    console.log(
      "Botón '¿Cómo estuvo el mes?' presente:",
      (await monthBtn.count()) === 1
    );
    await monthBtn.click();
    await page.waitForSelector("text=Analizando el mes", { timeout: 10000 });
    console.log("Estado 'Analizando el mes...' aparece: yes");
    await page.waitForSelector(".cyb-month-summary", { timeout: 120000 });
    const summaryText = (
      await page.locator(".cyb-month-summary").innerText()
    ).trim();
    console.log(
      "El resumen mensual llegó (texto):",
      summaryText.length > 20
        ? summaryText.replace(/\s+/g, " ").slice(0, 140)
        : "VACÍO"
    );

    // 8) Días futuros: vista solo lectura
    const next = new Date();
    next.setDate(next.getDate() + 1);
    const tomorrowIso = iso(next);

    await page.goto(base + "/bitacora/" + tomorrowIso, { waitUntil: "networkidle" });
    await page.waitForSelector(".future-blk", { timeout: 10000 });
    console.log("Vista futura (banner solo lectura): yes");
    const futureBanner = (
      await page.locator(".future-blk").innerText()
    ).toLowerCase();
    console.log(
      "Banner futuro sin 'en gris' y con 'podés dejar recordatorios':",
      !futureBanner.includes("en gris") &&
        futureBanner.includes("podés dejar recordatorios")
    );
    console.log(
      "Día futuro sin editores (Objetivos/Notas/Aprendizajes):",
      (await page.locator("h2:has-text('Objetivos')").count()) === 0 &&
        (await page.locator("h2:has-text('Notas del día')").count()) === 0 &&
        (await page.locator("h2:has-text('Qué aprendí')").count()) === 0
    );
    console.log(
      "Tarjeta de recordatorios presente en día futuro:",
      (await page.locator(".blk-tag", { hasText: "Recordatorios" }).count()) === 1
    );
    console.log(
      "Celda futura en gris (.future):",
      (await page.locator(`nav a[href="/bitacora/${tomorrowIso}"] .cyb-num.future`).count()) === 1
    );
    console.log(
      "Celda de hoy NO es gris:",
      (await page.locator(`nav a[href="/bitacora/${todayIso}"] .cyb-num.future`).count()) === 0
    );

    // 9) Recordatorios vía long-press sobre un día del calendario
    await page.goto(todayUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("h2:has-text('Objetivos')", { timeout: 15000 });

    const todayLink = page.locator(`nav a[href="/bitacora/${todayIso}"]`).first();
    const remText = "rem-" + Date.now();

    const longPress = async (locator) => {
      const box = await locator.boundingBox();
      if (!box) throw new Error("sin bounding box para long-press");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(650);
      await page.mouse.up();
      await page.waitForTimeout(200);
    };

    const modal = page.locator(".cyb-modal-panel");

    // Limpiar recordatorios que hayan quedado de corridas anteriores
    for (let attempts = 0; attempts < 5; attempts++) {
      if (!(await todayLink.locator(".has-reminder").count())) break;
      await longPress(todayLink);
      const borrar = modal.locator("button:has-text('Borrar')");
      const nBefore = await borrar.count();
      if (!nBefore) {
        await modal.locator("button[aria-label='Cerrar']").click();
        break;
      }
      await borrar.first().click();
      await page.waitForFunction(
        (b) =>
          [...document.querySelectorAll(".cyb-modal-panel button")].filter((x) =>
            x.textContent.includes("Borrar")
          ).length < b,
        nBefore,
        { timeout: 10000 }
      );
      await modal.locator("button[aria-label='Cerrar']").click();
      await page.waitForTimeout(400);
    }

    await longPress(todayLink);
    console.log("Modal de recordatorio tras long-press:", (await modal.count()) === 1);

    await modal.locator("textarea").first().fill(remText);
    await modal.locator("button:has-text('Agregar recordatorio')").click();
    await modal.getByText(remText).first().waitFor({ timeout: 10000 });
    console.log("Recordatorio creado desde el modal: yes");

    await modal.locator("button[aria-label='Cerrar']").click();
    await page.waitForTimeout(400);
    await page.waitForSelector(`nav a[href="/bitacora/${todayIso}"] .cyb-num.has-reminder`, {
      timeout: 10000,
    });
    console.log("Recuadro rojo aparece en el calendario: yes");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(`nav a[href="/bitacora/${todayIso}"] .cyb-num.has-reminder`, {
      timeout: 10000,
    });
    console.log("Recuadro rojo persiste tras reload: yes");
    console.log(
      "Tarjeta del día muestra contador de recordatorios:",
      (await page.locator(".blk-tag", { hasText: "Recordatorios (" }).count()) === 1
    );

    // Editar
    await longPress(todayLink);
    await modal.locator("button:has-text('Editar')").first().click();
    const remText2 = remText + "-edit";
    await modal.locator("textarea").first().fill(remText2);
    await modal.locator("button:has-text('Guardar')").click();
    await modal.getByText(remText2).first().waitFor({ timeout: 10000 });
    console.log("Recordatorio editado desde el modal: yes");
    await modal.locator("button[aria-label='Cerrar']").click();
    await page.waitForTimeout(300);

    // 9b) Marcar recordatorio como completo -> rojo desaparece; desmarcar -> vuelve
    await longPress(todayLink);
    await modal
      .locator("button[aria-label='Marcar recordatorio como completo']")
      .first()
      .click();
    await modal
      .locator("li.cyb-rem-done", { hasText: remText2 })
      .waitFor({ timeout: 10000 });
    console.log("Recordatorio marcado como completo (tachado): yes");
    await modal.locator("button[aria-label='Cerrar']").click();
    await page.waitForTimeout(300);
    await page.waitForFunction(
      (num) => {
        const link = [...document.querySelectorAll("nav a")].find((l) =>
          l.textContent.includes("*" + num)
        );
        return Boolean(link && !link.querySelector(".has-reminder"));
      },
      todayIso.slice(-2),
      { timeout: 10000 }
    );
    console.log("Recuadro rojo desaparece al completar: yes");

    await longPress(todayLink);
    await modal
      .locator("button[aria-label='Desmarcar como pendiente']")
      .first()
      .click();
    await modal
      .locator("li.enrow:not(.cyb-rem-done)", { hasText: remText2 })
      .waitFor({ timeout: 10000 });
    console.log("Desmarcar (vuelve a pendiente): yes");
    await modal.locator("button[aria-label='Cerrar']").click();
    await page.waitForTimeout(300);
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num.has-reminder`,
      { timeout: 10000 }
    );
    console.log("Recuadro rojo vuelve al desmarcar: yes");

    // Borrar
    await longPress(todayLink);
    await modal.locator("button:has-text('Borrar')").first().click();
    await modal.getByText(remText2).waitFor({ timeout: 10000, state: "detached" });
    await modal.locator("button[aria-label='Cerrar']").click();
    await page.waitForFunction(
      (num) => {
        const link = [...document.querySelectorAll("nav a")].find((l) =>
          l.textContent.includes("*" + num)
        );
        return Boolean(link && !link.querySelector(".has-reminder"));
      },
      todayIso.slice(-2),
      { timeout: 10000 }
    );
    console.log("Recuadro rojo desaparece al borrar: yes");

    // 11) FAB "REC+" (abajo a la izquierda): recordatorio con fecha propia
    await page.locator("button[aria-label='Agregar recordatorio con fecha propia']").click();
    await page.waitForSelector(".cyb-modal-panel", { timeout: 10000 });
    const next2 = new Date();
    next2.setDate(next2.getDate() + 2);
    const farText = "rem-fecha-" + Date.now();
    const dd = String(next2.getDate()).padStart(2, "0");
    const mm = String(next2.getMonth() + 1).padStart(2, "0");
    const yy = String(next2.getFullYear()).slice(-2);
    await modal.locator("textarea").first().fill(farText);
    await modal
      .locator('input[aria-label="Día del recordatorio (dd)"]')
      .fill(dd);
    await modal
      .locator('input[aria-label="Mes del recordatorio (mm)"]')
      .fill(mm);
    await modal
      .locator('input[aria-label="Año del recordatorio (aa)"]')
      .fill(yy);
    await modal.locator("button:has-text('Agregar recordatorio')").click();
    await modal.getByText(farText).first().waitFor({ timeout: 10000 });
    console.log("REC+ con fecha propia (dd/mm/aa) guarda correctamente: yes");
    await modal.locator("button[aria-label='Cerrar']").click();
    await page.waitForTimeout(300);

    // Un día futuro con recordatorio también se marca en rojo (sin gris)
    if (iso(next2).slice(0, 7) === todayIso.slice(0, 7)) {
      await page.waitForSelector(
        `nav a[href="/bitacora/${iso(next2)}"] .cyb-num.has-reminder`,
        { timeout: 10000 }
      );
      console.log("Día futuro con recordatorio también muestra recuadro rojo: yes");
    } else {
      console.log("Día futuro con recordatorio también muestra recuadro rojo: skip (cambio de mes)");
    }

    await page.goto(base + `/bitacora/${iso(next2)}`, { waitUntil: "networkidle" });
    await page.waitForSelector(`text=${farText}`, { timeout: 10000 });
    console.log("Recordatorio con fecha propia aparece en su día: yes");

    // Limpiar el recordatorio con fecha propia para no ensuciar la demo
    const farLink = page.locator(`nav a[href="/bitacora/${iso(next2)}"]`).first();
    await longPress(farLink);
    for (let t = 0; t < 5; t++) {
      const borrar = modal.locator("button:has-text('Borrar')");
      if ((await borrar.count()) === 0) break;
      await borrar.first().click();
      await page.waitForTimeout(1200);
      if ((await modal.getByText(farText).count()) === 0) break;
    }
    console.log(
      "Recordatorio de fecha propia eliminado:",
      (await modal.getByText(farText).count()) === 0
    );
    await modal.locator("button[aria-label='Cerrar']").click();

    // 11a) Efemérides: pestaña propia, agregar/editar/borrar, marcado en
    //     calendario y bloque en la vista del día (encima de la cita).
    console.log(
      "Link 'Efemérides' en el nav:",
      (await page.locator("nav a:has-text('Efemérides')").count()) === 1
    );
    await page.goto(base + "/bitacora/efemerides", { waitUntil: "networkidle" });
    await page.waitForSelector("button:has-text('Agregar efeméride')", {
      timeout: 10000,
    });
    console.log("Página de efemérides carga: yes");

    const efaText = "efa-" + Date.now();
    const efaDay = todayIso.slice(8, 10);
    const efaMonth = todayIso.slice(5, 7);
    await page
      .locator('input[aria-label="Día de la efeméride (dd)"]')
      .fill(efaDay);
    await page
      .locator('input[aria-label="Mes de la efeméride (mm)"]')
      .fill(efaMonth);
    await page.locator("textarea").first().fill(efaText);
    await page.locator("button:has-text('Agregar efeméride')").click();
    await page.getByText(efaText).first().waitFor({ timeout: 10000 });
    console.log("Efeméride agregada desde su pestaña: yes");
    console.log(
      "Indica próxima ocurrencia ('hoy'):",
      (await page.locator(`li:has-text('${efaText}') span.cyb-hint`).first().innerText()).includes("hoy")
    );

    // Editar contenido
    await page.locator(`li:has-text('${efaText}') button:has-text('Editar')`).click();
    const efaText2 = efaText + "-edit";
    await page.locator("textarea").first().fill(efaText2);
    await page.locator("button:has-text('Guardar')").click();
    await page.getByText(efaText2).first().waitFor({ timeout: 10000 });
    console.log("Efeméride editada: yes");

    // La celda del día se marca y el bloque aparece encima de la cita
    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num.has-annual`,
      { timeout: 10000 }
    );
    console.log("Celda con efeméride marcada (.has-annual): yes");
    const quote = page.locator("blockquote").first();
    const efemerideBlock = page.locator(".blk.efemeride-blk");
    const quoteBox = await quote.boundingBox();
    const efBox = await efemerideBlock.boundingBox();
    console.log(
      "Bloque 'Efemérides' está encima de la cita:",
      (await efemerideBlock.count()) === 1 &&
        Boolean(quoteBox && efBox && efBox.y < quoteBox.y)
    );
    console.log(
      "Muestra el texto de la efeméride en la vista del día:",
      (await efemerideBlock.getByText(efaText2).count()) === 1
    );

    // Borrar y verificar que desaparece del calendario
    await page.goto(base + "/bitacora/efemerides", { waitUntil: "networkidle" });
    await page.locator(`li:has-text('${efaText2}') button:has-text('Borrar')`).click();
    await page.getByText(efaText2).waitFor({ timeout: 10000, state: "detached" });
    console.log("Efeméride borrada: yes");
    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    console.log(
      "Celda ya no marcada tras borrar:",
      (await page.locator(`nav a[href="/bitacora/${todayIso}"] .cyb-num.has-annual`).count()) === 0
    );

    // 11a2) Categorías de efemérides: crear, renombrar, menú al guardar,
    //     mover, reordenar con flechas y volver a "sin separar" al borrar.
    await page.goto(base + "/bitacora/efemerides", { waitUntil: "networkidle" });
    await page.waitForSelector("input[aria-label='Nombre de la nueva categoría']", {
      timeout: 10000,
    });

    const catA = "cumple-" + Date.now();
    const catB = "aniv-" + Date.now();
    await page
      .locator("input[aria-label='Nombre de la nueva categoría']")
      .fill(catA);
    await page.locator("button:has-text('Agregar')").first().click();
    await page.waitForSelector(`.cat-chip:has-text('${catA}')`, { timeout: 10000 });
    console.log("Categoría creada (chip ámbar): yes");

    // Segundo parámetro mantiene el nombre hasta armar los checks de orden.
    console.log(
      "Segunda categoría agregada:",
      (await (async () => {
        await page
          .locator("input[aria-label='Nombre de la nueva categoría']")
          .fill(catB);
        await page.locator("button:has-text('Agregar')").first().click();
        await page
          .locator(`.cat-chip:has-text('${catB}')`)
          .waitFor({ timeout: 10000 });
        return true;
      })()) === true
    );

    // Renombrar la segunda categoría
    await page.locator(`.cat-chip:has-text('${catB}') button[aria-label^="Renombrar "]`).first().click();
    const catB2 = catB + "-b";
    await page.locator("input[aria-label^='Renombrar categoría ']").fill(catB2);
    await page.locator("button[aria-label='Confirmar nombre']").first().click();
    await page.waitForSelector(`.cat-chip:has-text('${catB2}')`, { timeout: 10000 });
    console.log("Categoría renombrada: yes");

    // Menú al guardar: elegir catA para una efeméride
    const cEfaA = "cefa-" + Date.now();
    await page.locator('input[aria-label="Día de la efeméride (dd)"]').fill(efaDay);
    await page.locator('input[aria-label="Mes de la efeméride (mm)"]').fill(efaMonth);
    await page.locator("textarea").first().fill(cEfaA);
    await page.locator("button:has-text('Agregar efeméride')").click();
    await page.waitForSelector(".cyb-modal-panel", { timeout: 10000 });
    console.log("Menú al guardar aparece (elegir categoría): yes");
    await page.locator(`.chip-btn:has-text('${catA}')`).click();
    await page.getByText(cEfaA).first().waitFor({ timeout: 10000 });
    let selectedCat = await page
      .locator(`li:has-text('${cEfaA}') select`)
      .first()
      .evaluate((el) => el.options[el.selectedIndex].text);
    console.log("Elegida la categoría, guarda ahí:", selectedCat === catA);

    // Sin elegir (cerrar menú con ✕) -> se anota como "sin separar"
    const cEfaB = "cefb-" + Date.now();
    await page.locator('input[aria-label="Día de la efeméride (dd)"]').fill(efaDay);
    await page.locator('input[aria-label="Mes de la efeméride (mm)"]').fill(efaMonth);
    await page.locator("textarea").first().fill(cEfaB);
    await page.locator("button:has-text('Agregar efeméride')").click();
    await page.waitForSelector(".cyb-modal-panel", { timeout: 10000 });
    await page.locator("button[aria-label='Cerrar sin elegir']").click();
    await page.getByText(cEfaB).first().waitFor({ timeout: 10000 });
    selectedCat = await page
      .locator(`li:has-text('${cEfaB}') select`)
      .first()
      .evaluate((el) => el.options[el.selectedIndex].text);
    console.log("Sin elegir se anota en 'Sin separar':", selectedCat === "Sin separar");

    // Mover la efeméride B a catA con el select
    await page.locator(`li:has-text('${cEfaB}') select`).first().selectOption({ label: catA });
    await page.locator(`li:has-text('${cEfaB}') select`).first().waitFor({ timeout: 10000 });
    selectedCat = await page
      .locator(`li:has-text('${cEfaB}') select`)
      .first()
      .evaluate((el) => el.options[el.selectedIndex].text);
    console.log("Mover con el select (a otra categoría):", selectedCat === catA);
    console.log(
      "Agrupadas bajo la categoría:",
      (await page.locator(`li:has-text('${cEfaA}')`).count()) === 1 &&
        (await page.locator(`li:has-text('${cEfaB}')`).count()) === 1
    );

    // Reordenar con flechas: bajar catA -> el orden de chips cambia
    const chipNames = async () =>
      page
        .locator(".cat-chip > span")
        .allTextContents()
        .then((names) => names.map((n) => n.trim()));
    const before = await chipNames();
    await page.locator(`.cat-chip:has-text('${catA}') button[aria-label^="Bajar"]`).click();
    await page.waitForTimeout(500);
    const after = await chipNames();
    const expected = [catB2, catA];
    console.log(
      "Flechas reordenan las categorías:",
      JSON.stringify(before) === JSON.stringify([catA, catB2]) &&
        JSON.stringify(after) === JSON.stringify(expected)
    );

    // Borrar catA (doble toque de confirmación) -> sus efemérides vuelven a "sin separar"
    const catAChip = page.locator(`.cat-chip:has-text('${catA}')`);
    await catAChip.locator("button[aria-label^='Borrar ']").click();
    await catAChip
      .locator("button[aria-label^='Confirmar borrado ']")
      .click();
    await page.locator(`.cat-chip:has-text('${catA}')`).waitFor({ timeout: 10000, state: "detached" });
    await page.waitForFunction(
      (text) =>
        Array.from(document.querySelectorAll(".cat-chip > span")).every(
          (el) => !el.textContent.includes(text)
        ),
      catA,
      { timeout: 10000 }
    );
    console.log("Borrar categoría (doble toque) la elimina: yes");
    await page.getByText(cEfaA).first().waitFor({ timeout: 10000 });
    selectedCat = await page
      .locator(`li:has-text('${cEfaA}') select`)
      .first()
      .evaluate((el) => el.options[el.selectedIndex].text);
    console.log("Sus efemérides quedan en 'Sin separar':", selectedCat === "Sin separar");

    // Cleanup: borrar categoría restante y las dos efemérides
    const catBChip = page.locator(`.cat-chip:has-text('${catB2}')`);
    await catBChip.locator("button[aria-label^='Borrar ']").click();
    await catBChip.locator("button[aria-label^='Confirmar borrado ']").click();
    await page.locator(`.cat-chip:has-text('${catB2}')`).waitFor({ timeout: 10000, state: "detached" });
    for (const t of [cEfaA, cEfaB]) {
      await page.locator(`li:has-text('${t}') button:has-text('Borrar')`).click();
      await page.getByText(t).waitFor({ timeout: 10000, state: "detached" });
    }
    console.log("Cleanup: categorías y efemérides de prueba borradas: yes");

    // 11b) Día destacado: botón ★ en la vista del día + anillo dorado en el calendario
    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    await page.waitForSelector("button[aria-label='Destacar este día']", {
      timeout: 10000,
    });
    await page.locator("button[aria-label='Destacar este día']").click();
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num.has-flag`,
      { timeout: 10000 }
    );
    console.log("Destacar día -> anillo dorado en el calendario: yes");
    await page.waitForSelector("button[aria-label='Quitar día destacado']", {
      timeout: 10000,
    });
    console.log("El botón pasa a estado 'Destacado ✓': yes");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num.has-flag`,
      { timeout: 10000 }
    );
    console.log("Anillo dorado persiste tras reload: yes");
    await page.locator("button[aria-label='Quitar día destacado']").click();
    await page.waitForFunction(
      (iso) => !document.querySelector(`nav a[href="/bitacora/${iso}"] .cyb-num.has-flag`),
      todayIso,
      { timeout: 15000 }
    );
    console.log("Quitar destacado -> anillo desaparece: yes");

    // Triple tap sobre el día de hoy -> modal rojo de borrado (doble OK)
    // Por seguridad solo se abre y se cancela (no borra data real).
    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const todayCellTap = page.locator(`nav a[href="/bitacora/${todayIso}"]`).first();
    await todayCellTap.click({ clickCount: 3, delay: 60 });
    await page.waitForTimeout(300);
    console.log(
      "Triple tap abre el modal rojo de borrado:",
      (await page.locator(".cyb-modal-danger").count()) === 1
    );
    console.log(
      "Primer OK presente (Seguro, borrar):",
      (await page.locator("button:has-text('Seguro, borrar')").count()) === 1
    );
    await page.locator("button:has-text('Seguro, borrar')").click();
    await page.waitForTimeout(100);
    const fireBtn = page.locator("button:has-text('SÍ, BORRAR')");
    console.log(
      "Segundo OK (SÍ, BORRAR) aparece tras el primero:",
      (await fireBtn.count()) === 1
    );
    console.log(
      "Un solo botón de borrado (sin 'Borrar para siempre'):",
      (await page.locator("button:has-text('Borrar para siempre')").count()) === 0
    );
    await page.locator("button:has-text('CANCELAR')").click();
    await page.waitForTimeout(200);
    console.log(
      "Modal se cierra al cancelar (no borra):",
      (await page.locator(".cyb-modal-danger").count()) === 0
    );
  } catch (e) {
    console.log("FALLO:", e.message);
  }

  console.log("ERRORES JS:", errors.length ? errors.join(" | ") : "ninguno");
  await browser.close();
})();