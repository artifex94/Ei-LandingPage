# Rediseño de la Home — Intención de diseño y plan

> Estado: propuesta para revisión · Sin cambios de código todavía
> Alcance: `apps/web/src/app/(landing)/page.tsx`, `src/components/sections/*`, `layout/*`
> Decisión: audiencia **balanceada** (prospecto + cliente), reordenando jerarquía para que **no compitan**.

---

## 1. Intención (el "para qué")

Dos audiencias, sin que se estorben, **bifurcando temprano y claro**:

- **Prospecto** (evalúa contratar): es la narrativa del scroll → qué hacemos · por qué confiar · pedir presupuesto.
- **Cliente** (ya confía): acceso directo y reconocible. Entra desde el nav en 1 clic, no necesita scrollear.

Como el cliente que vuelve resuelve desde arriba, el resto de la página trabaja para el prospecto sin penalizar a nadie.

### Principios

1. **Una acción primaria por zona.** Prospecto → "Solicitar presupuesto" (naranja). Cliente → "Mi Central" (esmeralda), como utilidad, no como segundo botón gigante en el hero.
2. **Color con significado.** Naranja = vender. Esmeralda = cliente/portal/estado. Nunca dos CTAs de igual peso en el hero.
3. **Confianza antes que portal** en el recorrido frío.
4. **Menos texto.** Una idea por elemento. Sin enumeraciones de adjetivos. (Ver §6.)

---

## 2. Nueva arquitectura

```
Navbar       → logo · nav · "Solicitar presupuesto" (naranja) · "Mi Central" (esmeralda, login)
1. Hero      → PROSPECTO. 1 CTA: Solicitar presupuesto. Visual de seguridad real (no dashboard).
2. Servicios → qué instalamos y monitoreamos.
3. Confianza → 26 años · +100 clientes · respuesta al instante · cobertura.
4. Opiniones → testimonios reales + captar feedback de clientes.
5. Empezá    → bifurcación: nuevo (presupuesto) / cliente existente (alta y match de datos).
6. Contacto  → datos directos + WhatsApp.
7. Footer
```

Cambios estructurales vs. hoy:
- **Portal baja** de la posición 2 a integrarse en "Empezá" (5) y en el nav.
- **Sale del hero** la grilla "accesos rápidos para clientes" (su lugar es Mi Central / nav).
- **Mi Central deja de ser una card de Servicios** (no es un servicio que se vende).
- **Dos secciones nuevas:** Opiniones (4) y Empezá (5).

---

## 3. Cambios por sección

### Navbar
- Login "Mi Central" siempre visible (esmeralda, estilo utilitario/outline).
- CTA de venta "Solicitar presupuesto" (naranja, primario).

### 1. Hero — el cambio de mayor impacto
- **Un CTA primario:** "Solicitar presupuesto". El acceso a cliente baja a enlace discreto: "¿Ya sos cliente? Entrá a Mi Central →".
- **Quitar** la grilla de accesos de cliente.
- **Cambiar el visual:** en vez del mockup de dashboard, foto de seguridad/presencia real (ya existen `instalacion-panel.webp` y `monitoreo-local.webp`). El dashboard puede vivir más chico en "Empezá".
- **Stats de confianza** en lugar de las garantías genéricas: `26 años` · `+100 clientes` · `respuesta al instante`.

### 2. Servicios
- Sube a posición 2. Patrón actual (acordeón mobile / grid desktop) se conserva.
- Sacar "Mi Central" de la grilla.

### 3. Confianza (deriva de la actual `FeaturesSection`)
- Reforzar lo más flojo de hoy. Mostrar los datos duros:
  - **26 años** en el sector.
  - **+100 clientes** y creciendo.
  - **Respuesta al instante** del evento.
  - **Cobertura:** Victoria y alrededores — Rosario, zonas rurales y localidades aledañas.
- Mantener las fotos (instalación + monitoreo) que humanizan.
- (No mencionar habilitaciones/registros.)

### 4. Opiniones (nueva)
- **Mostrar** testimonios reales de clientes (nombre, zona, frase corta).
- **Captar feedback:** CTA simple para que el cliente deje su opinión (form breve o reseña). Mostrar solo las aprobadas.

### 5. Empezá (nueva — la bifurcación concreta)
Una sección, dos puertas claras:

- **Soy nuevo** → "Solicitar presupuesto". Form de propuesta (qué querés proteger, zona, contacto).
- **Ya soy cliente** → "Crear mi acceso a Mi Central". Apunta a la ruta interna **`/solicitud-alta`** (ya en producción): pide nombre, WhatsApp, **DNI** (y CUIT si requiere factura) y procesa el alta para **asignar las cuentas** del cliente. No depende del subdominio `altausuario.*`.

Quien ya tiene acceso entra directo por el nav; esta sección es para registrarse/pedir presupuesto.

### 6. Contacto
- Datos directos (teléfono, WhatsApp, cobertura) + form. Foco en cierre.

---

## 4. Datos confirmados

| Dato | Valor |
|------|-------|
| Trayectoria | 26 años en el sector |
| Clientes | +100 y creciendo |
| Respuesta | Al instante del evento |
| Cobertura | Victoria y alrededores: Rosario, zonas rurales y localidades aledañas |
| Habilitaciones | No mencionar |
| Testimonios | A cargar desde la sección Opiniones |

---

## 5. Copy: corto y natural (anti "texto de IA")

Regla: **una idea por elemento, frases que diría una persona, no un folleto.** Sin tríos de adjetivos, sin relleno explicativo.

Ejemplos de recorte (actual → propuesto):

- Hero subtítulo
  - Hoy: *"Alarmas, cámaras, control de acceso y monitoreo 24 hs con Mi Central: pagos, documentación, solicitudes y soporte siempre a mano."*
  - Propuesto: **"Alarmas, cámaras y monitoreo 24 hs en Victoria y la zona."**

- Portal / Mi Central
  - Hoy: *"...entra directo a sus pagos, soporte, documentos y estado del servicio, con acceso rápido, contexto claro y menos pasos."*
  - Propuesto: **"Pagá, pedí soporte y mirá el estado de tu servicio."**

- "Próxima acción / El cliente sabe qué hacer, dónde pagar y cómo pedir ayuda."
  - Propuesto: **eliminar** (es relleno).

H1 del hero (definido): **"Siempre listo para cuidar lo que te importa."**

CTA: **"Solicitar presupuesto"** (reemplaza "Solicitar evaluación" en hero, nav, Servicios y banda Mi Central).

---

## 6. Ajustes visuales transversales

- **Jerarquía tipográfica:** reservar `font-black` para H1 / H2 de sección / números. Cuerpo en peso normal. Hoy casi todo es black y aplana la jerarquía.
- **Botones:** un primario (naranja relleno) y un secundario (ghost/outline). Esmeralda solo para el carril cliente.
- Mantener tokens `tactical-*` / `industrial-*` y formalizar esmeralda como token semántico de "cliente/estado".

---

## 7. Siguientes pasos

1. Validás el orden de secciones.
2. Implemento por sección, empezando por el Hero.

> No rompe el sistema actual: reordena jerarquía y reasigna elementos a la audiencia correcta, reutilizando componentes y tokens existentes.
