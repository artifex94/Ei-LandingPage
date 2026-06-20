/**
 * Anti-corruption layer (ACL) sobre la suite web de SoftGuard (:8080).
 *
 * El portal NUNCA habla el dialecto de SoftGuard directamente: estos
 * adaptadores traducen cada módulo de la suite a tipos limpios del dominio
 * y son la única frontera con la central. Organización (espeja los módulos
 * del Desktop de la suite):
 *
 *   core.ts      → transporte: config, login OAuth_Token, restGet con retry,
 *                  normalización (s/num/fecha/refCuenta). NO importarlo fuera
 *                  del ACL: los consumidores usan los adaptadores.
 *   monitoreo.ts → MultiMonitor Web / Monitoreo Web Remoto (eventos, códigos)
 *   crm.ts       → CRM (cuentas + estado de comunicación del panel)
 *   sertec.ts    → Servicio Técnico (órdenes de servicio de la central)
 *   sistema.ts   → salud de sesión y catálogo de módulos
 *
 * Receta para integrar un módulo nuevo de la suite:
 *   1. Capturar su tráfico real:  node --env-file=.env.local scripts/sg-capture.mjs "<Módulo>"
 *   2. Sondar el shape con datos: scripts/sg-probe-eventos.mjs como plantilla
 *   3. Crear `api/<modulo>.ts`: tipos Raw* (campos reales) + salida normalizada
 *      + fetchers que usan restGet de core
 *   4. Exportarlo acá; consumirlo desde endpoints /api/admin/* (autorización)
 *   5. SOLO LECTURA contra SoftGuard hasta decisión explícita del producto
 *
 * Inventario de módulos: ver docs/integracion-softguard.md §"Módulos de la suite".
 */

export { softguardWebApiConfigured, invalidateWebApiSession } from "./core";
export { pingWebApi, fetchModulosDesktop, type ModuloSuite } from "./sistema";
export {
  fetchCodigosAlarma,
  fetchEventosHistoricoMM,
  fetchEventosPendientes,
  type WebEvento,
} from "./monitoreo";
export {
  fetchCuentasCount,
  fetchCuentasDealer,
  fetchContactosCuenta,
  type WebCuenta,
  type WebContactoCuenta,
} from "./crm";
export {
  fetchOrdenesServicio,
  fetchOrdenesServicioCount,
  type WebOrdenServicio,
} from "./sertec";
