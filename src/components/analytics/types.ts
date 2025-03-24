export interface PedidoAnalytics {
  id: string;
  dataEnvio: string;
  fornecedor: string;
  valor: number;
  custo: number;
  resultadoBruto: number;
  resultadoPercentual: number;
  status?: string;
  idFechamento?: string;
}

export interface FornecedorAnalytics {
  nome: string;
  totalPedidos: number;
  valorTotal: number;
  custoTotal: number;
  resultadoBruto: number;
  resultadoPercentual: number;
  maiorMargem: number;
  menorMargem: number;
}

export interface PeriodoAnalytics {
  periodo: string;
  valorTotal: number;
  custoTotal: number;
  resultadoBruto: number;
  resultadoPercentual: number;
  pedidos: number;
}

export interface KPIData {
  ticketMedio: number;
  margemMedia: number;
  maiorMargem: number;
  menorMargem: number;
  totalPedidos: number;
  valorTotal: number;
  resultadoBruto: number;
}
