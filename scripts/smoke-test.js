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

    // 2) Ajustes HUD: definir marcado por cantidad (>=1) y guardar
    await page.goto(base + "/bitacora/settings", { waitUntil: "networkidle" });
    await page.waitForSelector(".cyb-in", { timeout: 10000 });
    console.log("Formularios de Ajustes con input HUD: yes");
    await page.selectOption('select[name="mode"]', "count");
    await page.fill('input[name="threshold"]', "1");
    await page.click("button:has-text('Guardar ajustes')");
    await page.waitForSelector("text=Ajustes guardados.", { timeout: 10000 });
    console.log("Ajustes guardados (count>=1): yes");

    // 2b) Notificaciones push: sección presente con toggle (SW inactivo en dev)
    await page.waitForSelector("text=Notificaciones_push", { timeout: 10000 });
    console.log(
      "Sección Notificaciones_push presente:",
      (await page.locator("h2:has-text('Notificaciones_push')").count()) === 1
    );
    const notifEnabled = (await page.locator("button:has-text('Activar notificaciones')").count()) === 1;
    console.log(
      "Botón Activar notificaciones presente:",
      notifEnabled
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

    // 6) Stats carga
    await page.click("a:has-text('Stats')");
    await page.waitForSelector("text=Estadísticas", { timeout: 10000 });
    console.log("Stats carga: yes");

    // 7) Dino chat: dock, 6 contactos, cambiar de dino y enviar mensaje (streaming)
    await page.waitForTimeout(400);
    const dock = page.locator(".cyb-dock");
    console.log("Dock flotante abajo a la derecha:", (await dock.count()) === 1);
    await dock.click();
    await page.waitForSelector(".cyb-dchat", { timeout: 8000 });
    console.log(
      "Panel de chat abierto con 6 dinos:",
      (await page.locator(".cyb-dchat-item").count()) === 6
    );
    console.log(
      "Dock desaparece con el panel abierto:",
      (await page.locator(".cyb-dock").count()) === 0
    );
    console.log(
      "Cada contacto con cabeza ASCII:",
      (await page.locator(".cyb-dchat-item pre").count()) === 6
    );
    await page.locator(".cyb-dchat-item", { hasText: "TYrA_" }).click();
    await page.waitForTimeout(300);
    console.log(
      "Cambio a TYrA_ en el header:",
      (await page.locator("h2", { hasText: "TYrA_" }).count()) === 1
    );

    const chatInput = page.locator(".cyb-dchat-input input");
    await chatInput.fill("Arrancamos la fase uno del proyecto. Que conste.");
    await chatInput.press("Enter");

    const firstDinoMsg = page.locator(".cyb-msg.dino", {
      hasText: /TYrA_/,
    });
    let streamed = false;
    try {
      await firstDinoMsg.first().waitFor({ timeout: 90000 });
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll(".cyb-msg.dino")].some((el) => {
            const txt = el.textContent || "";
            return txt.length > 10 && !txt.includes("TRANSMITIENDO");
          }),
        { timeout: 90000 }
      );
      const reply = await page
        .locator(".cyb-msg.dino")
        .last()
        .innerText();
      console.log(
        "Respuesta de TYrA_ con streaming (texto):",
        reply.length > 0 ? reply.replace(/\s+/g, " ").slice(0, 120) : "VACÍA"
      );
      streamed = reply.length > 0;
    } catch (e) {
      console.log("El modelo gratuito no respondió a tiempo (se sigue verificando el resto):", e.message);
    }
    console.log("Streaming recibido:", streamed ? "yes" : "no");

    const stored = await page.evaluate(() =>
      sessionStorage.getItem("db_dino_chat_v1")
    );
    console.log("Conversación en sessionStorage:", stored ? "yes" : "no");

    // 7b) Botones "cómo va el día / mes" (contexto en memoria por request)
    const quickRow = page.locator(".cyb-dchat-quick");
    console.log(
      "Botones CÓMO VA EL DÍA / MES presentes:",
      (await quickRow.locator("button").count()) === 2
    );
    const mmInput = page.locator(
      ".cyb-dchat-quick input[aria-label='Mes (mm/yy)']"
    );
    console.log(
      "Sin input mm/yy visible hasta pedir el mes:",
      (await mmInput.count()) === 0
    );

    const dinoBeforeDay = await page.locator(".cyb-msg.dino").count();
    await page.locator(".cyb-dchat-quick button:has-text('VA EL DÍA')").click();
    let dayReplied = false;
    try {
      await page.waitForFunction(
        (n) => document.querySelectorAll(".cyb-msg.dino").length >= n + 1,
        dinoBeforeDay,
        { timeout: 90000 }
      );
      dayReplied = true;
    } catch (e) {
      console.log("El bot no respondió al día a tiempo:", e.message);
    }
    console.log("Botón 'Cómo va el día' responde:", dayReplied ? "yes" : "no");

    await page.locator(".cyb-dchat-quick button:has-text('VA EL MES')").click();
    await page.waitForTimeout(200);
    console.log(
      "Al apretar el mes aparece el input mm/yy:",
      (await mmInput.count()) === 1
    );
    console.log(
      "mm/yy precargado con el mes actual:",
      /^\d{2}\/\d{2}$/.test(await mmInput.inputValue())
    );

    const dinoBeforeMonth = await page.locator(".cyb-msg.dino").count();
    await mmInput.press("Enter");
    let monthReplied = false;
    try {
      await page.waitForFunction(
        (n) => document.querySelectorAll(".cyb-msg.dino").length >= n + 1,
        dinoBeforeMonth,
        { timeout: 90000 }
      );
      monthReplied = true;
    } catch (e) {
      console.log("El bot no respondió al mes a tiempo:", e.message);
    }
    console.log("Botón 'Cómo va el mes' responde:", monthReplied ? "yes" : "no");
    console.log(
      "El input se oculta tras preguntar el mes:",
      (await mmInput.count()) === 0
    );

    await page.locator(".cyb-dchat-close").click();
    await page.waitForTimeout(300);
    console.log("Panel se cierra con ✕:", (await page.locator(".cyb-dchat").count()) === 0);

    // 8) Días futuros: vista solo lectura
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    const todayIso = iso(new Date());
    const next = new Date();
    next.setDate(next.getDate() + 1);
    const tomorrowIso = iso(next);

    await page.goto(base + "/bitacora/" + tomorrowIso, { waitUntil: "networkidle" });
    await page.waitForSelector(".future-blk", { timeout: 10000 });
    console.log("Vista futura (banner solo lectura): yes");
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
    await modal.locator('input[aria-label="Fecha del recordatorio"]').fill(`${dd}/${mm}/${yy}`);
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