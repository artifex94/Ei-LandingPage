# Brief de elementos visuales para Codex (image gen) — Escobar Instalaciones

> Objetivo: elevar el aspecto del sitio con assets generados por IA, **coherentes con la marca**, sin romper la composición ni el sistema visual actual.
> Modelo objetivo: generación de imágenes de Codex (gpt-image). Cada asset trae prompt listo para pegar.

---

## Parte 1 — Crítica de diseño (lente visual)

### Impresión general
El sistema visual ya es sólido y coherente (paleta, tipografía, motion). El techo hoy no es el layout: es que **lo visual descansa casi todo en gradientes + grilla + glows genéricos**, y solo hay 2 fotos. Falta una capa gráfica propia (textura de marca, iconografía custom, arte de fondo) que haga que el sitio se sienta "diseñado" y no "armado con utilidades".

### Hallazgos (visual / imagery)

| Hallazgo | Severidad | Recomendación |
|---|---|---|
| Fondos = gradiente radial + grilla genérica, repetidos en casi todas las secciones | 🟡 | Introducir una **textura/motivo de marca** (órbita-comet, radar, circuito sutil) reutilizable |
| Solo 2 imágenes reales; el resto es color plano | 🟡 | Sumar arte de fondo por sección + iconografía custom |
| Iconos = set genérico de librería (lucide) | 🟢 | Set de **íconos de marca** (naranja, estilo propio) al menos para los 5 servicios |
| El motivo "comet/órbita" del logo no se reutiliza en ningún lado | 🟡 | Convertirlo en **lenguaje gráfico**: separadores, glows, patrón de fondo |
| Sin OpenGraph image propia (se comparte sin identidad) | 🟡 | Generar OG 1200×630 de marca |
| Opiniones (estado vacío) y Empezá se ven planos | 🟢 | Arte de fondo sutil por card |

### Lo que funciona y hay que preservar
- Paleta y tokens (`tactical-*` / `industrial-*`), contraste y foco accesible.
- Motion sutil (hero-enter, reveal-on-scroll, glow del logo, grilla animada).
- El logo comet "EI" ya integrado — es el ancla del lenguaje visual a expandir.

### Recomendaciones prioritarias
1. **Definir un lenguaje gráfico de marca** (comet + radar + grid) y producir 3-4 texturas/fondos reutilizables. Es lo que más "trasciende" el aspecto.
2. **Iconografía custom de servicios** (5 piezas consistentes).
3. **OG image + arte de hero** para identidad y primera impresión.

> Nota de honestidad: para fotos con **personas** (operadores, técnicos, clientes/testimonios) NO conviene usar IA — caras sintéticas restan confianza en una empresa local real. Para lo humano, usar **fotos reales del equipo y de instalaciones de Escobar**. La IA se reserva para lo abstracto/gráfico (fondos, texturas, íconos, OG, ilustración conceptual).

---

## Parte 2 — Guía de estilo (pegar en CADA prompt)

Bloque base para mantener consistencia entre todas las imágenes:

```
ESTILO DE MARCA (Escobar Instalaciones — seguridad electrónica):
- Paleta: fondo casi negro #020617 y azul-pizarra #0f172a; acento naranja de marca #F17720
  y ámbar cálido #FBB47A; acento secundario verde esmeralda #34D399; blancos puros para brillos.
- Mood: industrial, táctico, premium, confiable, nocturno; calmo pero alerta.
- Acabado: moderno, minimalista, mucho aire negativo, profundidad sutil, grano fotográfico fino.
- Motivo recurrente: anillo/órbita tipo "comet" (estela que se afina), barrido de radar,
  grilla técnica tenue, sensores/escudos abstractos.
- PROHIBIDO: texto, letras, logos, marcas de agua, personas con rostro reconocible,
  colores fuera de paleta, estética stock/corporativa cliché.
```

Reglas técnicas:
- Pedir **fondo transparente** (PNG) para íconos, motivos y separadores.
- Fondos de sección: PNG/JPG, luego convertir a **WebP** y optimizar.
- Generar a 2× del tamaño de uso para nitidez en retina.

---

## Parte 3 — Assets a solicitar (con destino y prompt)

### A. Fondo de Hero (arte ambiental)
- **Destino:** `apps/web/public/images/hero-bg.webp` (capa detrás del contenido del Hero)
- **Tamaño:** 2560×1440 (16:9), sin transparencia
- **Prompt:**
```
[ESTILO DE MARCA]
Fondo abstracto cinematográfico para hero de sitio de seguridad. Composición nocturna
oscura con una gran órbita/anillo tipo comet de luz naranja #F17720 que se afina en estela,
cruzando la diagonal superior derecha. Grilla técnica tenue en perspectiva, partículas de luz
muy sutiles, profundidad y bruma. Zona izquierda más oscura y despejada para texto.
Sin texto, sin personas. 16:9.
```

### B. Set de íconos de servicios (5 piezas)
- **Destino:** `apps/web/public/icons/servicio-{alarma,camara,acceso,monitoreo,automatizacion}.png`
- **Tamaño:** 512×512 c/u, **fondo transparente**
- **Cómo:** generar uno por uno repitiendo la misma frase de estilo para que sean consistentes (o un "icon sheet" 3×2 y recortar).
- **Prompt (plantilla, cambiar solo el sujeto):**
```
[ESTILO DE MARCA]
Ícono premium, vista frontal, estilo lineal-duotono con relleno sutil, trazo naranja #F17720
con leve glow, sobre fondo TRANSPARENTE. Coherente como parte de un set. Sujeto: {alarma con
ondas de aviso | cámara de seguridad CCTV | lector de control de acceso / huella | central de
monitoreo con barrido de radar | casa con automatización y escenas}. Minimalista, sin texto,
512×512, padding interno uniforme.
```

### C. Textura/patrón de marca (tileable)
- **Destino:** `apps/web/public/textures/orbit-grid.png` (reemplaza/realza la grilla actual)
- **Tamaño:** 1024×1024, **transparente**, **seamless (repetible)**
- **Prompt:**
```
[ESTILO DE MARCA]
Patrón seamless repetible, muy tenue, sobre fondo TRANSPARENTE: finísima grilla técnica
combinada con pequeños arcos de órbita y puntos de nodo, en blanco a baja opacidad con algún
acento naranja #F17720 esporádico. Apto como textura de fondo a 6-10% de opacidad. Sin texto.
```

### D. Separador / motivo comet (decorativo)
- **Destino:** `apps/web/public/images/comet-divider.png`
- **Tamaño:** 2400×600, **transparente**
- **Prompt:**
```
[ESTILO DE MARCA]
Elemento gráfico horizontal: una estela de comet/órbita naranja #F17720 a ámbar, que entra
fina, engrosa y se afina, con chispas sutiles, sobre fondo TRANSPARENTE. Para usar como
separador entre secciones. Sin texto, 2400×600.
```

### E. OpenGraph / social
- **Destino:** `apps/web/src/app/opengraph-image.(png|webp)` (ya referenciado en `siteConfig.ogImage`)
- **Tamaño:** 1200×630, sin transparencia. **El texto se agrega por código/encima**, no por IA.
- **Prompt:**
```
[ESTILO DE MARCA]
Fondo para tarjeta social 1200×630: composición oscura premium con la órbita comet naranja
#F17720 a la derecha y degradé hacia negro a la izquierda (zona limpia para sobreponer logo y
título). Grilla técnica tenue, profundidad. Sin texto, sin logo.
```

### F. Arte de las dos puertas de "Empezá"
- **Destino:** `apps/web/public/images/empeza-nuevo.png` y `empeza-cliente.png`
- **Tamaño:** 1200×900, **transparente** o con degradé al fondo de la card
- **Prompt (variar acento):**
```
[ESTILO DE MARCA]
Arte de fondo sutil para card. Variante NUEVO: glow y arcos en naranja #F17720 (presupuesto,
inicio). Variante CLIENTE: glow y arcos en verde esmeralda #34D399 (acceso, portal). Abstracto,
esquina inferior, deja el centro despejado para texto. Sin texto.
```

### G. Ilustración conceptual de confianza (opcional)
- **Destino:** `apps/web/public/images/confianza.webp`
- **Tamaño:** 1600×1200
- **Prompt:**
```
[ESTILO DE MARCA]
Ilustración conceptual (no foto): un hogar/comercio protegido por una cúpula/escudo de luz
naranja translúcida, con nodos de sensores y un barrido de radar, vista nocturna serena.
Estilo premium semi-abstracto, sin personas, sin texto, 4:3.
```

---

## Parte 4 — Flujo de trabajo con Codex

1. Pegar el bloque **[ESTILO DE MARCA]** + el prompt del asset. Pedir **fondo transparente** donde corresponda.
2. Iterar 2-3 variantes por asset; elegir.
3. Exportar, convertir a **WebP**, optimizar (p. ej. `squoosh`/`sharp`), respetar nombres/rutas de arriba.
4. Cablear en el código (te lo hago yo): fondos de sección, `next/image`, reemplazo de íconos lucide por el set, `opengraph-image`.
5. Revisar contraste y peso (cada fondo full-bleed idealmente < 150-200 KB en WebP).

### Orden sugerido (impacto/esfuerzo)
1. A (hero bg) + C (textura) → cambio de aire inmediato en todo el sitio.
2. B (íconos servicios) → personalidad de marca.
3. E (OG) → identidad al compartir.
4. D, F, G → pulido.

---

## Parte 5 — Qué hago yo una vez tengas los assets
- Integro cada imagen en su sección respetando el layout actual.
- Reemplazo los íconos lucide de Servicios por el set custom (manteniendo accesibilidad).
- Conecto `opengraph-image` y verifico peso/contraste.
- Ajusto opacidades de textura para que sea sutil (no compita con el contenido).
```
