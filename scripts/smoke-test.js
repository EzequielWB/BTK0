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

    // Terminal de acceso: marco OSD, reloj vivo, scanlines, ojo y typewriter
    console.log(
      "OSD 'ACCESO RESTRINGIDO':",
      (await page.locator("text=Acceso restringido").count()) >= 1
    );
    await page.waitForSelector(".osd-clock", { timeout: 8000 });
    console.log(
      "Reloj OSD HH:MM:SS:",
      /^#?\d{2}:\d{2}:\d{2}$/.test(
        (await page.locator(".osd-clock").innerText()).trim()
      )
    );
    console.log(
      "Scanlines presentes:",
      (await page.locator(".login-scanlines").count()) === 1
    );
    console.log(
      "Ojo ASCII presente:",
      (await page.locator("canvas.login-eye").count()) === 1
    );
    await page.waitForFunction(
      () => {
        const h = document.querySelector("h1.font-pixel[data-phrase-src]");
        if (!h) return false;
        const span = h.querySelector("span");
        return (
          !!span && span.textContent === h.getAttribute("data-phrase-src")
        );
      },
      { timeout: 8000 }
    );
    console.log("Frase tipeada completa (typewriter): yes");

    // Login incorrecto → contador INTENTO, el ojo mira de frente, flash CRT y negro absoluto
    await page.fill('input[name="password"]', "clave-equivocada");
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=INTENTO 1", { timeout: 10000 });
    console.log("Contador INTENTO tras clave errónea: yes");
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
    await page.waitForSelector("text=IDENTIDAD VERIFICADA", {
      timeout: 12000,
    });
    console.log("Animación de acceso (IDENTIDAD VERIFICADA): yes");
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
      (await page.locator('[aria-label="Año anterior"]').count()) === 1
    );
    const yearText = async () => page.locator("nav .cal-btn + span").first().innerText();
    const yearBefore = await yearText();
    await page.locator('[aria-label="Año siguiente"]').click();
    await page.waitForTimeout(200);
    const yearAfter = await yearText();
    console.log(
      "Botón de año cambia el año:",
      Number(yearAfter) === Number(yearBefore) + 1
    );
    await page.locator('[aria-label="Año anterior"]').click();
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

    // 2c) Metas temporales (premios): crear desde Ajustes, verla en el día,
    //     desactivar, reactivar, editar y borrar.
    const goalsSection = page
      .locator("section.blk")
      .filter({ has: page.locator("h2:has-text('Metas_temporales')") });
    const metaTitle = "meta-" + Date.now();
    const metaTitle2 = metaTitle + "-b";
    await page.goto(base + "/bitacora/settings", { waitUntil: "networkidle" });
    await goalsSection.locator('input[name="title"]').fill(metaTitle);
    await goalsSection.locator('input[name="start_date"]').fill(todayIso);
    await goalsSection.locator('input[name="end_date"]').fill(todayIso);
    await goalsSection.locator("button:has-text('Crear meta')").click();
    await goalsSection.locator(`li:has-text('${metaTitle}')`).waitFor({ timeout: 10000 });
    console.log("Meta temporal creada desde Ajustes: yes");
    console.log(
      "Mensaje 'Meta temporal creada.':",
      (await goalsSection.getByText("Meta temporal creada.").count()) === 1
    );

    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    const activesSection = page
      .locator("section.blk")
      .filter({ has: page.locator("h2:has-text('Metas_activas')") });
    await activesSection.locator(`li:has-text('${metaTitle}')`).waitFor({ timeout: 10000 });
    console.log("Aparece en la vista del día ('Metas_activas'): yes");

    // Desactivar -> desaparece del día y queda 'Desactivada' en Ajustes
    await page.goto(base + "/bitacora/settings", { waitUntil: "networkidle" });
    await goalsSection
      .locator(`li:has-text('${metaTitle}') button:has-text('Desactivar')`)
      .click();
    await page.waitForFunction(
      (t) => {
        const li = Array.from(document.querySelectorAll("li")).find(
          (el) => el.className.includes("enrow") && el.textContent.includes(t)
        );
        return Boolean(li) && li.textContent.includes("Desactivada");
      },
      metaTitle,
      { timeout: 10000 }
    );
    console.log("Desactivada -> 'Desactivada' en Ajustes: yes");
    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    console.log(
      "Desactivada ya no aparece en la vista del día:",
      (await page.locator(`section:has(h2:has-text('Metas_activas')) li:has-text('${metaTitle}')`).count()) === 0
    );

    // Reactivar -> vuelve a la vista del día
    await page.goto(base + "/bitacora/settings", { waitUntil: "networkidle" });
    await goalsSection
      .locator(`li:has-text('${metaTitle}') button:has-text('Activar')`)
      .click();
    await page.waitForFunction(
      (t) => {
        const li = Array.from(document.querySelectorAll("li")).find(
          (el) => el.className.includes("enrow") && el.textContent.includes(t)
        );
        return Boolean(li) && li.textContent.includes("Desactivar");
      },
      metaTitle,
      { timeout: 10000 }
    );
    console.log("Reactivada (vuelve el botón 'Desactivar'): yes");

    // Editar título (en modo edición el li muestra el form, no el strong)
    await goalsSection
      .locator(`li:has-text('${metaTitle}') button:has-text('Editar')`)
      .click();
    const editingRow = goalsSection.locator("li.enrow").filter({
      hasText: "Guardar cambios",
    });
    await editingRow.waitFor({ timeout: 10000 });
    await editingRow.locator('input[name="title"]').fill(metaTitle2);
    await editingRow.locator("button:has-text('Guardar cambios')").click();
    await editingRow.locator("button:has-text('Cancelar')").click();
    await goalsSection
      .locator(`li:has-text('${metaTitle2}') button:has-text('Borrar')`)
      .waitFor({ timeout: 10000 });
    console.log("Meta editada (nuevo título): yes");

    // Borrar -> desaparece de Ajustes y del día
    await goalsSection
      .locator(`li:has-text('${metaTitle2}') button:has-text('Borrar')`)
      .click();
    await page.waitForFunction(
      (t) =>
        !Array.from(document.querySelectorAll("li")).some(
          (el) => el.className.includes("enrow") && el.textContent.includes(t)
        ),
      metaTitle2,
      { timeout: 10000 }
    );
    console.log("Meta borrada de Ajustes: yes");
    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    console.log(
      "No queda rastro de la meta en la vista del día:",
      (await page.locator(`section:has(h2:has-text('Metas_activas')) li:has-text('${metaTitle2}')`).count()) === 0
    );

    // 2d) Modos de completado: count/percent + umbral cambian el punto verde
    //     (verde = segs-g en la celda de HOY). El bloque normaliza el día a un
    //     estado conocido y solo lee el verde DESPUÉS de una navegación completa
    //     (el nav no se refresca al instante tras tocar un slot).
    const todaySeg = page.locator(`nav a[href="/bitacora/${todayIso}"] .cyb-num i.segs-g`);
    const setCompletion = async (mode, threshold) => {
      await page.goto(base + "/bitacora/settings", { waitUntil: "networkidle" });
      await page.selectOption('select[name="mode"]', mode);
      await page.fill('input[name="threshold"]', String(threshold));
      await page.click("button:has-text('Guardar ajustes')");
      await page.waitForSelector("text=Ajustes guardados.", { timeout: 10000 });
      await page.goto(todayUrl, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
    };
const setSlotDo = async (label) => {
  await page
    .locator(".cyb-trio")
    .nth(2)
    .locator('button[aria-label="' + label + '"]')
    .click();
};
while ((await page.locator("button:has-text('ignorado · quitar')").count()) > 0) {
  await page.locator("button:has-text('ignorado · quitar')").first().click();
  await page.waitForTimeout(800);
}

// Normalizar: los 3 objetivos en ✓.
// El resto del bloque solo toca el trio #2 (el tercer objetivo), así el
// conteo de los otros dos queda fijo en ✓.
await setCompletion("count", 2);
for (let i = 0; i < 3; i++) {
  await page
    .locator(".cyb-trio")
    .nth(i)
    .locator('button[aria-label="Completado"]')
    .click();
  await page.waitForTimeout(700);
}
await setCompletion("count", 2);
console.log(
  "count/umbral 2: con 3 ✓ (3 puntos) marca:",
  (await todaySeg.count()) === 1
);
console.log(
  "Render del día con 3/3 · 100%:",
  (await page.locator("h2:has-text('Objetivos')").first().innerText().then((t) => /3\/3/.test(t)))
);

// 2 ✓ + 1 ✕ = 2 puntos -> sigue marcando con umbral 2
setSlotDo("Sin hacer");
await page.waitForTimeout(1500);
await setCompletion("count", 2);
console.log(
  "count/umbral 2: con 2 ✓ (2 puntos) marca:",
  (await todaySeg.count()) === 1
);

// 2 ✓ + 1 − = 2.5 puntos -> NO llega al umbral 3 (el − suma 0.5, no 1)
setSlotDo("A medias");
await page.waitForTimeout(1500);
await setCompletion("count", 3);
console.log(
  "− suma 0.5: 2 ✓ + 1 − = 2.5 no llega al umbral 3 (no marca):",
  (await todaySeg.count()) === 0
);

// 3 ✓ = 3 puntos -> llega al umbral 3
setSlotDo("Completado");
await page.waitForTimeout(1500);
await setCompletion("count", 3);
console.log(
  "Con la 3ra en ✓: 3 puntos >= umbral 3 marca:",
  (await todaySeg.count()) === 1
);

// Modo percent: 2 ✓ + 1 − = 2.5/3 = 83%
setSlotDo("A medias");
await page.waitForTimeout(1500);
await setCompletion("percent", 84);
    console.log(
      "percent/umbral 84: 2 ✓ + 1 − = 83% < 84 no marca:",
      (await todaySeg.count()) === 0
    );
    await setCompletion("percent", 83);
    console.log(
      "percent/umbral 83: 83% >= 83 marca:",
      (await todaySeg.count()) === 1
    );

    // Restaurar: vuelve al modo count/umbral 1 (flujo de los bloques siguientes)
    await setCompletion("count", 1);
    console.log(
      "Restaurado count/umbral 1 (vuelve a marcar):",
      (await todaySeg.count()) === 1
    );

    // 3) Volver al día y verificar segmentos de colores (verde/amarillo/rojo)
    await page.goto(todayUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("h2:has-text('Objetivos')", { timeout: 15000 });
    console.log("Vista del día con tarjetas (edificio N):", (await page.locator(".blk").count()) >= 4);
    const todayNum = new URL(todayUrl).pathname.split("/").pop().slice(-2);
    const todayCell = page.locator(`nav a:has-text('*${todayNum}')`).first();

    // 4) La Hoja (pensamientos del día): sección inline con autoguardado
    const sheet = page.locator(".cyb-paper");
    await sheet.waitFor({ timeout: 10000 });
    console.log("La Hoja como sección en la vista del día: yes");
    const sheetTextarea = sheet.locator("textarea");

    // Limpiar sobras de corridas anteriores (si el día quedó con texto)
    const prevSheet = (await sheetTextarea.inputValue()).trim();
    if (prevSheet) {
      await sheetTextarea.fill("");
      await page.waitForFunction(
        (iso) =>
          !document.querySelector(`nav a[href="/bitacora/${iso}"] .cyb-num .cyb-dots i.dot-w`),
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

    // Restaurar texto real -> marca de tinta blanca en el calendario
    await sheetTextarea.fill(pensoText);
    await page
      .locator(".paper-status", { hasText: "Guardado" })
      .waitFor({ timeout: 10000 });
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num .cyb-dots i.dot-w`,
      { timeout: 10000 }
    );
    console.log("Marca de tinta (dot-w) en el calendario: yes");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(
      `nav a[href="/bitacora/${todayIso}"] .cyb-num .cyb-dots i.dot-w`,
      { timeout: 10000 }
    );
    console.log("Marca persiste tras reload: yes");
    const loadedSheetText = (await page.locator(".cyb-paper-in").inputValue()).trim();
    console.log(
      "El texto del pensamiento persiste en la hoja:",
      loadedSheetText === pensoText
    );

    // Limpiar la hoja -> la fila se borra y la marca desaparece
    if (loadedSheetText !== pensoText) {
      await page.locator(".cyb-paper-in").fill(pensoText);
      await page
        .locator(".paper-status", { hasText: "Guardado" })
        .waitFor({ timeout: 10000 });
    }
    await page.locator(".cyb-paper-in").fill("");
    await page
      .locator(".paper-status", { hasText: "Guardado" })
      .waitFor({ timeout: 10000 });
    await page.waitForFunction(
      (iso) =>
        !document.querySelector(`nav a[href="/bitacora/${iso}"] .cyb-num .cyb-dots i.dot-w`),
      todayIso,
      { timeout: 10000 }
    );
    console.log("Al vaciar la hoja, la fila se borra y la marca desaparece: yes");

    // 5c) Objetivos del día: lista por día (no Ajustes), completar/desmarcar,
    //     editar inline, borrar; pendientes visibles en días pasados; sin
    //     sección en días futuros
    await page.goto(todayUrl, { waitUntil: "networkidle" });
    const dayGoalsSection = page
      .locator("section.blk", { hasText: "Objetivos_del_día" })
      .last();
    await dayGoalsSection
      .locator("input[aria-label='Nuevo objetivo del día']")
      .waitFor({ timeout: 10000 });
    console.log("Sección 'Objetivos_del_día' en la vista del día: yes");

    // Limpiar sobras de corridas anteriores
    let leftoverGoals = await dayGoalsSection.locator(".enrow").count();
    while (leftoverGoals > 0) {
      await dayGoalsSection.locator("button:has-text('Borrar')").first().click();
      await page.waitForTimeout(400);
      leftoverGoals = await dayGoalsSection.locator(".enrow").count();
    }

    const goalTitle = "blabla-" + Date.now();
    await dayGoalsSection
      .locator("input[aria-label='Nuevo objetivo del día']")
      .fill(goalTitle);
    await dayGoalsSection.locator("button:has-text('Agregar objetivo')").click();
    await page.waitForFunction(
      (t) =>
        [...document.querySelectorAll(".enrow")].some((r) =>
          r.textContent.includes(t)
        ),
      goalTitle,
      { timeout: 10000 }
    );
    console.log("Agrega un objetivo del día en la lista: yes");
    console.log(
      "Nuevo pendiente (sin tick lleno):",
      (await dayGoalsSection.locator(".cyb-goal-tick.done").count()) === 0
    );

    await dayGoalsSection.locator(".cyb-goal-tick").first().click();
    await page.waitForFunction(
      () => document.querySelectorAll(".cyb-goal-tick.done").length === 1,
      { timeout: 10000 }
    );
    console.log("Marcar completado -> tick lleno: yes");

    await page.reload({ waitUntil: "networkidle" });
    const dayGoalsSection2 = page
      .locator("section.blk", { hasText: "Objetivos_del_día" })
      .last();
    await dayGoalsSection2
      .locator(".cyb-goal-tick.done")
      .first()
      .waitFor({ timeout: 10000 });
    console.log("Completado persiste tras reload: yes");

    await dayGoalsSection2.locator(".cyb-goal-tick.done").first().click();
    await page.waitForFunction(
      () => document.querySelectorAll(".cyb-goal-tick.done").length === 0,
      { timeout: 10000 }
    );
    console.log("Desmarcar vuelve a pendiente: yes");

    await dayGoalsSection2.locator("button:has-text('Editar')").first().click();
    const editedTitle = goalTitle + "-edit";
    await dayGoalsSection2
      .locator("input[aria-label='Editar objetivo del día']")
      .fill(editedTitle);
    await dayGoalsSection2.locator("button:has-text('Guardar')").click();
    await page.waitForFunction(
      (t) =>
        [...document.querySelectorAll(".enrow")].some((r) =>
          r.textContent.includes(t)
        ),
      editedTitle,
      { timeout: 10000 }
    );
    console.log("Editar inline actualiza el título: yes");

    // Día pasado: un pendiente se ve como "quedó pendiente"
    const pastIso = iso(new Date(Date.now() - 86400000));
    await page.goto(base + "/bitacora/" + pastIso, {
      waitUntil: "networkidle",
    });
    const pastGoalsSection = page
      .locator("section.blk", { hasText: "Objetivos_del_día" })
      .last();
    await pastGoalsSection
      .locator("input[aria-label='Nuevo objetivo del día']")
      .waitFor({ timeout: 10000 });
    let pastLeftover = await pastGoalsSection.locator(".enrow").count();
    while (pastLeftover > 0) {
      await pastGoalsSection.locator("button:has-text('Borrar')").first().click();
      await page.waitForTimeout(400);
      pastLeftover = await pastGoalsSection.locator(".enrow").count();
    }
    await pastGoalsSection
      .locator("input[aria-label='Nuevo objetivo del día']")
      .fill("ayer-" + Date.now());
    await pastGoalsSection.locator("button:has-text('Agregar objetivo')").click();
    await pastGoalsSection
      .locator("text=quedó pendiente")
      .first()
      .waitFor({ timeout: 10000 });
    console.log("Día pasado con pendiente -> 'quedó pendiente': yes");
    let pastRemaining = await pastGoalsSection.locator(".enrow").count();
    while (pastRemaining > 0) {
      await pastGoalsSection.locator("button:has-text('Borrar')").first().click();
      await page.waitForTimeout(400);
      pastRemaining = await pastGoalsSection.locator(".enrow").count();
    }
    console.log("Limpieza del objetivo en día pasado: yes");

    // Día futuro: la sección NO existe
    const futureIso = iso(new Date(Date.now() + 86400000));
    await page.goto(base + "/bitacora/" + futureIso, {
      waitUntil: "networkidle",
    });
    console.log(
      "Día futuro sin sección 'Objetivos_del_día':",
      (await page.locator("h2:has-text('Objetivos_del_día')").count()) === 0
    );

    // Limpiar: borrar el objetivo del día de hoy
    await page.goto(todayUrl, { waitUntil: "networkidle" });
    const dayGoalsSection3 = page
      .locator("section.blk", { hasText: "Objetivos_del_día" })
      .last();
    await dayGoalsSection3
      .locator("button:has-text('Borrar')")
      .first()
      .click();
    await page.waitForFunction(
      (t) =>
        ![...document.querySelectorAll(".enrow")].some((r) =>
          r.textContent.includes(t)
        ),
      editedTitle,
      { timeout: 10000 }
    );
    let goalCleanup = await dayGoalsSection3.locator(".enrow").count();
    while (goalCleanup > 0) {
      await dayGoalsSection3.locator("button:has-text('Borrar')").first().click();
      await page.waitForTimeout(400);
      goalCleanup = await dayGoalsSection3.locator(".enrow").count();
    }
    console.log("Borrar objetivo del día (sin rastro): yes");

    // 6) Stats carga
    await page.click("a:has-text('Stats')");
    await page.waitForSelector("text=Estadísticas", { timeout: 10000 });
    console.log("Stats carga: yes");

    // 7) El chat de dinos fue eliminado del código: sin dock ni panel
    console.log(
      "Chat de dinos eliminado (sin dock):",
      (await page.locator(".cyb-dock").count()) === 0
    );
    console.log(
      "Sin botón de abrir chat:",
      (await page.locator('button[aria-label="Abrir chat de dinosaurios"]').count()) === 0
    );

    // 7b) Resumen mensual con IA, justo debajo de los gráficos
    const monthBtn = page.locator("button:has-text('¿Cómo va el mes?')");
    console.log(
      "Botón '¿Cómo va el mes?' presente:",
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
      "Día futuro sin editores (Objetivos):",
      (await page.locator("h2:has-text('Objetivos')").count()) === 0
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
    // Si el menú "¿Dónde la guardo?" abre (hay categorías), elegir Sin separar.
    const picker = page.locator(".cyb-modal-panel");
    try {
      await picker.waitFor({ state: "visible", timeout: 3000 });
      await picker.getByText("Sin separar", { exact: true }).click();
    } catch {
      // sin menú: la efeméride se guarda directo
    }
    await page.locator(`li.enrow:has-text('${efaText}')`).waitFor({ timeout: 10000 });
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
    await page.waitForTimeout(1500);
    console.log("Efeméride borrada: yes");
    await page.goto(base + `/bitacora/${todayIso}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    console.log(
      "Celda ya no marcada tras borrar:",
      (await page.locator(".efemeride-blk").getByText(efaText2).count()) === 0
    );

    // 11a2) Categorías de efemérides: crear, renombrar, menú al guardar,
    //     mover, reordenar con flechas y volver a "sin separar" al borrar.
    await page.goto(base + "/bitacora/efemerides", { waitUntil: "networkidle" });
    await page.waitForSelector("input[aria-label='Nombre de la nueva categoría']", {
      timeout: 10000,
    });

    // Pre-cleanup: borrar categorías de prueba de corridas fallidas (la del
    // usuario, "Cumpleaños", se conserva). Verifica que el borrado persista
    // pasado el efecto optimista (espera extra antes de confirmar ausencia).
    const deleteCategoryChip = async (nm) => {
      const chip = page.locator(`.cat-chip:has-text('${nm}')`);
      if ((await chip.count()) === 0) return true;
      await chip.locator("button[aria-label^='Borrar ']").click();
      await chip.locator("button[aria-label^='Confirmar borrado ']").click();
      await chip.waitFor({ timeout: 10000, state: "detached" });
      await page.waitForTimeout(1500);
      return (await chip.count()) === 0;
    };
    const toClean = (
      await page.locator(".cat-chip > span").allTextContents()
    ).map((n) => n.trim());
    for (const nm of toClean) {
      if (nm === "Cumpleaños" || nm === "Sin separar") continue;
      if (!(await deleteCategoryChip(nm))) {
        console.log("Pre-cleanup falló borrando:", nm);
      }
    }
    const surviving = (
      await page.locator(".cat-chip > span").allTextContents()
    ).map((n) => n.trim());
    console.log("Pre-cleanup, chips restantes:", surviving.join(" | "));

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

    // Reordenar con flechas: bajar catA -> queda DESPUÉS de catB2.
    // El check no asume la cantidad de chips (puede haber categorías previas).
    const chipNames = async () =>
      page
        .locator(".cat-chip > span")
        .allTextContents()
        .then((names) => names.map((n) => n.trim()));
    const before = await chipNames();
    await page
      .locator(`.cat-chip:has-text('${catA}') button[aria-label^="Bajar"]`)
      .click();
    await page.waitForFunction(
      ({ a, b }) => {
        const names = Array.from(
          document.querySelectorAll(".cat-chip > span")
        ).map((s) => (s.textContent || "").trim());
        const ia = names.indexOf(a);
        const ib = names.indexOf(b);
        return ia !== -1 && ib !== -1 && ia > ib;
      },
      { a: catA, b: catB2 },
      { timeout: 10000 }
    );
    const after = await chipNames();
    console.log(
      "Flechas reordenan las categorías:",
      before.indexOf(catA) < before.indexOf(catB2) &&
        after.indexOf(catA) > after.indexOf(catB2)
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
    // Dar tiempo a que la acción resuelva (evita que la siguiente corra en
    // paralelo y el storage local pierda escrituras) antes de verificar.
    await page.waitForTimeout(1500);
    console.log("Borrar categoría (doble toque) la elimina: yes");
    await page.getByText(cEfaA).first().waitFor({ timeout: 10000 });
    selectedCat = await page
      .locator(`li:has-text('${cEfaA}') select`)
      .first()
      .evaluate((el) => el.options[el.selectedIndex].text);
    console.log("Sus efemérides quedan en 'Sin separar':", selectedCat === "Sin separar");

    // Cleanup: borrar categoría restante y las dos efemérides (seriado para
    // que la acción anterior termine antes de lanzar la siguiente).
    const settle = () => page.waitForTimeout(1500);
    const catBChip = page.locator(`.cat-chip:has-text('${catB2}')`);
    await catBChip.locator("button[aria-label^='Borrar ']").click();
    await catBChip.locator("button[aria-label^='Confirmar borrado ']").click();
    await page.locator(`.cat-chip:has-text('${catB2}')`).waitFor({ timeout: 10000, state: "detached" });
    await page.waitForFunction(
      (text) =>
        Array.from(document.querySelectorAll(".cat-chip > span")).every(
          (el) => !el.textContent.includes(text)
        ),
      catB2,
      { timeout: 10000 }
    );
    await settle();
    for (const t of [cEfaA, cEfaB]) {
      await page.locator(`li:has-text('${t}') button:has-text('Borrar')`).click();
      await page.getByText(t).waitFor({ timeout: 10000, state: "detached" });
      await settle();
      if ((await page.getByText(t).count()) !== 0) {
        console.log("Cleanup falló borrando:", t);
      }
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