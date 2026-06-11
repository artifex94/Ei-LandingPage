/**
 * Shim de compatibilidad. El adaptador creció a un anti-corruption layer
 * organizado por módulos de la suite: ver `./api/` (core, monitoreo, crm,
 * sistema). Este archivo re-exporta la superficie pública para no romper
 * los imports existentes; el código nuevo puede importar de
 * `@/lib/softguard/api` directamente.
 */

export * from "./api";
