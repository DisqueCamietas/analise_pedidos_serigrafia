import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';
import { PedidoAnalytics, FornecedorAnalytics, PeriodoAnalytics, KPIData } from '../components/analytics/types';
import { format, parseISO, startOfMonth, isWithinInterval, startOfDay, endOfDay, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pedido {
  dataEnvio: string;
  fornecedor: string;
  valor: string;
  custo: string;
  tipo: string;
  status?: string;
  idFechamento?: string;
}

interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
}

export function useAnalyticsData(filters?: AnalyticsFilters) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoAnalytics[]>([]);
  const [fornecedoresAnalytics, setFornecedoresAnalytics] = useState<FornecedorAnalytics[]>([]);
  const [periodoAnalytics, setPeriodoAnalytics] = useState<PeriodoAnalytics[]>([]);
  const [kpis, setKpis] = useState<KPIData>({
    ticketMedio: 0,
    margemMedia: 0,
    maiorMargem: 0,
    menorMargem: 0,
    totalPedidos: 0,
    valorTotal: 0,
    resultadoBruto: 0
  });
  
  // Usar useRef para evitar múltiplas requisições com os mesmos filtros
  const prevFilters = useRef<AnalyticsFilters | undefined>();
  const isMounted = useRef(true);

  // Memoizar as funções de processamento para evitar recriações
  const processarAnalisesFornecedor = useCallback((pedidosArray: PedidoAnalytics[]) => {
    const fornecedoresMap = new Map<string, FornecedorAnalytics>();
    
    pedidosArray.forEach(pedido => {
      const fornecedor = pedido.fornecedor;
      
      if (!fornecedoresMap.has(fornecedor)) {
        fornecedoresMap.set(fornecedor, {
          nome: fornecedor,
          totalPedidos: 0,
          valorTotal: 0,
          custoTotal: 0,
          resultadoBruto: 0,
          resultadoPercentual: 0,
          maiorMargem: 0,
          menorMargem: 100
        });
      }
      
      const fornecedorData = fornecedoresMap.get(fornecedor)!;
      
      fornecedorData.totalPedidos += 1;
      fornecedorData.valorTotal += pedido.valor;
      fornecedorData.custoTotal += pedido.custo;
      fornecedorData.resultadoBruto += pedido.resultadoBruto;
      
      // Atualizar maior e menor margem
      if (pedido.resultadoPercentual > fornecedorData.maiorMargem) {
        fornecedorData.maiorMargem = pedido.resultadoPercentual;
      }
      
      if (pedido.resultadoPercentual < fornecedorData.menorMargem && pedido.resultadoPercentual > 0) {
        fornecedorData.menorMargem = pedido.resultadoPercentual;
      }
    });
    
    // Calcular percentual médio
    fornecedoresMap.forEach(fornecedor => {
      fornecedor.resultadoPercentual = fornecedor.valorTotal > 0 
        ? (fornecedor.resultadoBruto / fornecedor.valorTotal) * 100 
        : 0;
    });
    
    return Array.from(fornecedoresMap.values());
  }, []);

  const processarAnalisesPeriodo = useCallback((pedidosArray: PedidoAnalytics[]) => {
    const periodosMap = new Map<string, PeriodoAnalytics>();
    
    pedidosArray.forEach(pedido => {
      const data = parseISO(pedido.dataEnvio);
      const inicioMes = startOfMonth(data);
      const periodoKey = format(inicioMes, 'yyyy-MM');
      const periodoNome = format(inicioMes, 'MMMM/yyyy', { locale: ptBR });
      
      if (!periodosMap.has(periodoKey)) {
        periodosMap.set(periodoKey, {
          periodo: periodoNome,
          valorTotal: 0,
          custoTotal: 0,
          resultadoBruto: 0,
          resultadoPercentual: 0,
          pedidos: 0
        });
      }
      
      const periodoData = periodosMap.get(periodoKey)!;
      
      periodoData.pedidos += 1;
      periodoData.valorTotal += pedido.valor;
      periodoData.custoTotal += pedido.custo;
      periodoData.resultadoBruto += pedido.resultadoBruto;
    });
    
    // Calcular percentual médio por período
    periodosMap.forEach(periodo => {
      periodo.resultadoPercentual = periodo.valorTotal > 0 
        ? (periodo.resultadoBruto / periodo.valorTotal) * 100 
        : 0;
    });
    
    // Ordenar períodos cronologicamente
    const periodos = Array.from(periodosMap.values());
    periodos.sort((a, b) => {
      const mesAnoA = a.periodo.split('/');
      const mesAnoB = b.periodo.split('/');
      
      if (mesAnoA[1] !== mesAnoB[1]) {
        return parseInt(mesAnoA[1]) - parseInt(mesAnoB[1]);
      }
      
      const mesesPtBR = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                         'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      
      return mesesPtBR.indexOf(mesAnoA[0].toLowerCase()) - mesesPtBR.indexOf(mesAnoB[0].toLowerCase());
    });
    
    return periodos;
  }, []);

  const calcularKPIs = useCallback((pedidosArray: PedidoAnalytics[]) => {
    if (pedidosArray.length === 0) {
      return {
        ticketMedio: 0,
        margemMedia: 0,
        maiorMargem: 0,
        menorMargem: 0,
        totalPedidos: 0,
        valorTotal: 0,
        resultadoBruto: 0
      };
    }
    
    const totalPedidos = pedidosArray.length;
    const valorTotal = pedidosArray.reduce((sum, pedido) => sum + pedido.valor, 0);
    const resultadoBruto = pedidosArray.reduce((sum, pedido) => sum + pedido.resultadoBruto, 0);
    
    // Ticket médio
    const ticketMedio = valorTotal / totalPedidos;
    
    // Margem média
    const margemMedia = (resultadoBruto / valorTotal) * 100;
    
    // Maior e menor margem
    let maiorMargem = 0;
    let menorMargem = 100;
    
    pedidosArray.forEach(pedido => {
      if (pedido.resultadoPercentual > maiorMargem) {
        maiorMargem = pedido.resultadoPercentual;
      }
      
      if (pedido.resultadoPercentual < menorMargem && pedido.resultadoPercentual > 0) {
        menorMargem = pedido.resultadoPercentual;
      }
    });
    
    return {
      ticketMedio,
      margemMedia,
      maiorMargem,
      menorMargem,
      totalPedidos,
      valorTotal,
      resultadoBruto
    };
  }, []);

  // Função para verificar se os filtros são iguais
  const areFiltersEqual = (filtersA?: AnalyticsFilters, filtersB?: AnalyticsFilters) => {
    if (!filtersA && !filtersB) return true;
    if (!filtersA || !filtersB) return false;
    
    return (
      isEqual(startOfDay(filtersA.startDate), startOfDay(filtersB.startDate)) &&
      isEqual(endOfDay(filtersA.endDate), endOfDay(filtersB.endDate))
    );
  };

  // Função para processar os dados
  const processData = useCallback(async () => {
    if (areFiltersEqual(filters, prevFilters.current)) {
      return; // Evitar refetch se os filtros não mudaram
    }
    
    // Atualizar a referência dos filtros anteriores
    prevFilters.current = filters ? { ...filters } : undefined;
    
    setLoading(true);
    
    try {
      const pedidosRef = ref(database, 'pedidos');
      const snapshot = await get(pedidosRef);
      
      // Verificar se o componente ainda está montado
      if (!isMounted.current) return;
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pedidosArray: PedidoAnalytics[] = [];
        
        // Processar pedidos
        Object.entries(data).forEach(([id, pedidoData]) => {
          const pedido = pedidoData as Pedido;
          
          // Filtrar apenas pedidos do tipo personalizada
          if (pedido.tipo === 'personalizada') {
            // Verificar se o pedido está dentro do intervalo de datas
            if (filters) {
              const pedidoDate = parseISO(pedido.dataEnvio);
              const dateInRange = isWithinInterval(pedidoDate, {
                start: startOfDay(filters.startDate),
                end: endOfDay(filters.endDate)
              });
              
              if (!dateInRange) {
                return; // Pular este pedido se não estiver no intervalo de datas
              }
            }
            
            // Converter valores de string para número
            const valor = parseFloat(pedido.valor.replace(',', '.'));
            const custo = pedido.custo ? parseFloat(pedido.custo.replace(',', '.')) : 0;
            const resultadoBruto = valor - custo;
            const resultadoPercentual = custo > 0 ? (resultadoBruto / valor) * 100 : 0;
            
            pedidosArray.push({
              id,
              dataEnvio: pedido.dataEnvio,
              fornecedor: pedido.fornecedor,
              valor,
              custo,
              resultadoBruto,
              resultadoPercentual,
              status: pedido.status,
              idFechamento: pedido.idFechamento
            });
          }
        });
        
        // Verificar se o componente ainda está montado
        if (!isMounted.current) return;
        
        setPedidos(pedidosArray);
        
        // Processar análises
        const fornecedores = processarAnalisesFornecedor(pedidosArray);
        const periodos = processarAnalisesPeriodo(pedidosArray);
        const kpisCalculados = calcularKPIs(pedidosArray);
        
        // Verificar se o componente ainda está montado
        if (!isMounted.current) return;
        
        setFornecedoresAnalytics(fornecedores);
        setPeriodoAnalytics(periodos);
        setKpis(kpisCalculados);
      } else {
        // Se não houver dados, inicializar com arrays vazios
        setPedidos([]);
        setFornecedoresAnalytics([]);
        setPeriodoAnalytics([]);
        setKpis({
          ticketMedio: 0,
          margemMedia: 0,
          maiorMargem: 0,
          menorMargem: 0,
          totalPedidos: 0,
          valorTotal: 0,
          resultadoBruto: 0
        });
      }
      
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar dados para análise:', error);
      
      // Verificar se o componente ainda está montado
      if (!isMounted.current) return;
      
      setError('Erro ao carregar dados para análise. Tente novamente.');
    } finally {
      // Verificar se o componente ainda está montado
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [filters, processarAnalisesFornecedor, processarAnalisesPeriodo, calcularKPIs]);

  useEffect(() => {
    isMounted.current = true;
    
    processData();
    
    return () => {
      isMounted.current = false;
    };
  }, [processData]);

  return {
    loading,
    error,
    pedidos,
    fornecedoresAnalytics,
    periodoAnalytics,
    kpis
  };
}
