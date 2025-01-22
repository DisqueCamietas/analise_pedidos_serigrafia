import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';
import { FilterValues } from './Filters';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box
} from '@mui/material';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

interface Pedido {
  dataEnvio: string;
  fornecedor: string;
  valor: string;
  custo: string;
  tipo: string;
}

interface ReportProps {
  filters: FilterValues;
}

export function Report({ filters }: ReportProps) {
  const [pedidos, setPedidos] = useState<[string, Pedido][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      setLoading(true);
      try {
        const pedidosRef = ref(database, 'pedidos');
        const snapshot = await get(pedidosRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const pedidosArray = Object.entries(data) as [string, Pedido][];
          
          const filteredPedidos = pedidosArray.filter(([numero, pedido]) => {
            if (pedido.tipo !== 'personalizada') return false;
            
            const pedidoDate = parseISO(pedido.dataEnvio);
            const dateInRange = isWithinInterval(pedidoDate, {
              start: startOfDay(filters.startDate),
              end: endOfDay(filters.endDate)
            });

            const fornecedorMatch = filters.fornecedor === 'Todos' || 
              pedido.fornecedor === filters.fornecedor;

            const statusMatch = filters.status === 'aberto' ? 
              !pedido.custo : pedido.custo;

            const numeroMatch = !filters.numeroPedido || 
              numero.includes(filters.numeroPedido);

            return dateInRange && fornecedorMatch && statusMatch && numeroMatch;
          });

          setPedidos(filteredPedidos);
        }
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [filters]);

  const calcularResultado = (valor: string, custo: string) => {
    if (!custo) return valor;
    const valorNum = parseFloat(valor.replace(',', '.'));
    const custoNum = parseFloat(custo.replace(',', '.'));
    return (valorNum - custoNum).toFixed(2);
  };

  const calcularPorcentagem = (valor: string, custo: string) => {
    if (!custo) return "100.00";
    const valorNum = parseFloat(valor.replace(',', '.'));
    const custoNum = parseFloat(custo.replace(',', '.'));
    const resultado = valorNum - custoNum;
    return ((resultado / valorNum) * 100).toFixed(2);
  };

  if (loading) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nº Pedido</TableCell>
              <TableCell>Fornecedor</TableCell>
              <TableCell>Data</TableCell>
              <TableCell align="right">Valor Venda</TableCell>
              <TableCell align="right">Custo</TableCell>
              <TableCell align="right">Resultado Bruto</TableCell>
              <TableCell align="right">Resultado %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidos.map(([numero, pedido]) => (
              <TableRow key={numero}>
                <TableCell>{numero}</TableCell>
                <TableCell>{pedido.fornecedor}</TableCell>
                <TableCell>
                  {format(parseISO(pedido.dataEnvio), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell align="right">R$ {pedido.valor}</TableCell>
                <TableCell align="right">
                  {pedido.custo ? `R$ ${pedido.custo}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {pedido.custo ? `R$ ${calcularResultado(pedido.valor, pedido.custo)}` : '-'}
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{
                    color: () => {
                      if (!pedido.custo) return 'inherit';
                      const porcentagem = parseFloat(calcularPorcentagem(pedido.valor, pedido.custo));
                      if (porcentagem >= 70) return 'green';
                      if (porcentagem >= 40) return '#DAA520'; // Amarelo mais escuro para melhor visibilidade
                      return 'red';
                    }
                  }}
                >
                  {pedido.custo ? `${calcularPorcentagem(pedido.valor, pedido.custo)}%` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
