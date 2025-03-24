import { useState } from 'react';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { AnalyticsFilters, AnalyticsFilterValues } from './AnalyticsFilters';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function SupplierAnalysis() {
  const [dateFilters, setDateFilters] = useState<AnalyticsFilterValues | undefined>();
  const { loading, error, fornecedoresAnalytics, pedidos } = useAnalyticsData(dateFilters);
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('');

  const handleFilterChange = (filters: AnalyticsFilterValues) => {
    setDateFilters(filters);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Selecionar o primeiro fornecedor por padrão se nenhum estiver selecionado
  if (fornecedoresAnalytics.length > 0 && !selectedFornecedor) {
    setSelectedFornecedor(fornecedoresAnalytics[0].nome);
  }

  // Filtrar pedidos do fornecedor selecionado
  const pedidosFornecedor = pedidos.filter(p => p.fornecedor === selectedFornecedor);

  // Dados para o gráfico de comparação de fornecedores
  const fornecedoresComparisonData = {
    labels: fornecedoresAnalytics.map(f => f.nome),
    datasets: [
      {
        label: 'Margem Média (%)',
        data: fornecedoresAnalytics.map(f => f.resultadoPercentual),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Dados para o gráfico de radar de fornecedores
  const radarData = {
    labels: ['Valor Total', 'Margem Média', 'Maior Margem', 'Menor Margem', 'Total de Pedidos'],
    datasets: fornecedoresAnalytics.map((f, index) => ({
      label: f.nome,
      data: [
        // Normalizar os valores para uma escala de 0-100
        (f.valorTotal / Math.max(...fornecedoresAnalytics.map(f => f.valorTotal))) * 100,
        f.resultadoPercentual,
        f.maiorMargem,
        f.menorMargem,
        (f.totalPedidos / Math.max(...fornecedoresAnalytics.map(f => f.totalPedidos))) * 100,
      ],
      backgroundColor: `rgba(${index * 50 + 100}, ${255 - index * 30}, ${index * 50 + 100}, 0.2)`,
      borderColor: `rgba(${index * 50 + 100}, ${255 - index * 30}, ${index * 50 + 100}, 1)`,
      borderWidth: 1,
    })),
  };

  // Dados para o gráfico de pedidos por fornecedor
  const pedidosFornecedorData = {
    labels: pedidosFornecedor.map(p => p.id),
    datasets: [
      {
        label: 'Valor (R$)',
        data: pedidosFornecedor.map(p => p.valor),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Margem (%)',
        data: pedidosFornecedor.map(p => p.resultadoPercentual),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  };

  // Opções para os gráficos
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  const pedidosFornecedorOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Valor (R$)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Margem (%)'
        },
        min: 0,
        max: 100,
      },
    },
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2) + '%';
  };

  // Encontrar o fornecedor selecionado
  const fornecedorSelecionado = fornecedoresAnalytics.find(f => f.nome === selectedFornecedor);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Filtros de data */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <AnalyticsFilters onFilterChange={handleFilterChange} />
      </Paper>
      
      {/* Seletor de Fornecedor */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Fornecedor</InputLabel>
          <Select
            value={selectedFornecedor}
            label="Fornecedor"
            onChange={(e) => setSelectedFornecedor(e.target.value)}
          >
            {fornecedoresAnalytics.map((fornecedor) => (
              <MenuItem key={fornecedor.nome} value={fornecedor.nome}>
                {fornecedor.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* KPIs do Fornecedor */}
      {fornecedorSelecionado && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total de Pedidos
                </Typography>
                <Typography variant="h4" color="primary">
                  {fornecedorSelecionado.totalPedidos}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Valor Total
                </Typography>
                <Typography variant="h4" color="primary">
                  {formatCurrency(fornecedorSelecionado.valorTotal)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Margem Média
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatPercent(fornecedorSelecionado.resultadoPercentual)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resultado Bruto
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(fornecedorSelecionado.resultadoBruto)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Comparação de Margens por Fornecedor
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Bar options={barOptions} data={fornecedoresComparisonData} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Análise Comparativa de Fornecedores
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 300 }}>
              <Radar data={radarData} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Gráfico de pedidos do fornecedor selecionado */}
      {pedidosFornecedor.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Pedidos de {selectedFornecedor}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ height: 300 }}>
            <Bar options={pedidosFornecedorOptions} data={pedidosFornecedorData} />
          </Box>
        </Paper>
      )}

      {/* Tabela de Fornecedores */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Análise Detalhada de Fornecedores
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fornecedor</TableCell>
                <TableCell align="center">Total de Pedidos</TableCell>
                <TableCell align="right">Valor Total (R$)</TableCell>
                <TableCell align="right">Custo Total (R$)</TableCell>
                <TableCell align="right">Resultado (R$)</TableCell>
                <TableCell align="right">Margem Média (%)</TableCell>
                <TableCell align="right">Maior Margem (%)</TableCell>
                <TableCell align="right">Menor Margem (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fornecedoresAnalytics.map((fornecedor) => (
                <TableRow 
                  key={fornecedor.nome}
                  sx={{ 
                    backgroundColor: fornecedor.nome === selectedFornecedor 
                      ? 'rgba(0, 0, 0, 0.04)' 
                      : 'inherit'
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {fornecedor.nome}
                      {fornecedor.nome === selectedFornecedor && (
                        <Chip 
                          label="Selecionado" 
                          color="primary" 
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{fornecedor.totalPedidos}</TableCell>
                  <TableCell align="right">{formatCurrency(fornecedor.valorTotal)}</TableCell>
                  <TableCell align="right">{formatCurrency(fornecedor.custoTotal)}</TableCell>
                  <TableCell align="right">{formatCurrency(fornecedor.resultadoBruto)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: fornecedor.resultadoPercentual < 30 
                        ? 'error.main' 
                        : fornecedor.resultadoPercentual < 50 
                          ? 'warning.main' 
                          : 'success.main'
                    }}
                  >
                    {formatPercent(fornecedor.resultadoPercentual)}
                  </TableCell>
                  <TableCell align="right">{formatPercent(fornecedor.maiorMargem)}</TableCell>
                  <TableCell align="right">{formatPercent(fornecedor.menorMargem)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
