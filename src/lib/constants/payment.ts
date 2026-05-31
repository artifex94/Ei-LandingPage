export const METODO_LABEL: Record<string, string> = {
  EFECTIVO:               "Efectivo",
  CHEQUE:                 "Cheque",
  TRANSFERENCIA_BANCARIA: "Transferencia bancaria",
  MERCADOPAGO:            "MercadoPago",
  TALO_CVU:               "Talo CVU",
};

export const METODOS = Object.entries(METODO_LABEL).map(([value, label]) => ({ value, label }));
