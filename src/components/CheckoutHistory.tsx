import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  IconButton,
  Collapse,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import HistoryIcon from '@mui/icons-material/History';

interface PedidoInfo {
  numeroPedido: string;
  valor: string;
  dataEnvio: string;
}

interface LogItem {
  tipo: 'criacao' | 'edicao' | 'cancelamento';
  usuario: string;
  data: number;
  detalhes: string;
}

interface Fechamento {
  fornecedor: string;
  dataPagamento: string;
  valorTotal: string;
  pedidos: PedidoInfo[];
  usuario: string;
  dataRegistro: number;
  log: LogItem[];
}

interface RowProps {
  id: string;
  fechamento: Fechamento;
}

function Row(props: RowProps) {
  const { id, fechamento } = props;
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {id}
        </TableCell>
        <TableCell>{format(new Date(fechamento.dataRegistro), 'dd/MM/yyyy HH:mm')}</TableCell>
        <TableCell>{format(parseISO(fechamento.dataPagamento), 'dd/MM/yyyy')}</TableCell>
        <TableCell>{fechamento.fornecedor}</TableCell>
        <TableCell align="right">R$ {fechamento.valorTotal}</TableCell>
        <TableCell align="center">{fechamento.pedidos.length}</TableCell>
        <TableCell>
          <IconButton
            aria-label="histórico"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setLogOpen(!logOpen);
            }}
          >
            <HistoryIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      
      {/* Detalhes dos pedidos */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Pedidos incluídos
              </Typography>
              <Table size="small" aria-label="pedidos">
                <TableHead>
                  <TableRow>
                    <TableCell>Número do Pedido</TableCell>
                    <TableCell>Data de Envio</TableCell>
                    <TableCell align="right">Valor (R$)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fechamento.pedidos.map((pedido, index) => (
                    <TableRow key={`pedido-${id}-${index}`}>
                      <TableCell component="th" scope="row">
                        {pedido.numeroPedido}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(pedido.dataEnvio), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell align="right">{pedido.valor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
      
      {/* Log de alterações */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={logOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Histórico de alterações
              </Typography>
              <Table size="small" aria-label="log">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Detalhes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fechamento.log.map((item, index) => (
                    <TableRow key={`log-${id}-${index}`}>
                      <TableCell>
                        {format(new Date(item.data), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)} 
                          color={
                            item.tipo === 'criacao' ? 'success' : 
                            item.tipo === 'edicao' ? 'primary' : 
                            'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.usuario}</TableCell>
                      <TableCell>{item.detalhes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function CheckoutHistory() {
  const [fechamentos, setFechamentos] = useState<[string, Fechamento][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<string[]>(['Todos']);
  const [filtros, setFiltros] = useState({
    fornecedor: 'Todos',
    startDate: startOfDay(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: endOfDay(new Date()),
  });

  useEffect(() => {
    const fetchFechamentos = async () => {
      setLoading(true);
      try {
        const fechamentosRef = ref(database, 'fechamentos');
        const snapshot = await get(fechamentosRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const fechamentosArray = Object.entries(data) as [string, Fechamento][];
          
          // Extrair lista de fornecedores únicos
          const uniqueFornecedores = ['Todos', ...new Set(fechamentosArray.map(([_, f]) => f.fornecedor))];
          setFornecedores(uniqueFornecedores);
          
          setFechamentos(fechamentosArray);
        } else {
          setFechamentos([]);
        }
      } catch (error) {
        console.error('Erro ao buscar fechamentos:', error);
        setError('Erro ao carregar fechamentos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchFechamentos();
  }, []);

  const handleFornecedorChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const fornecedor = event.target.value as string;
    setFiltros(prev => ({ ...prev, fornecedor }));
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setFiltros(prev => ({ ...prev, startDate: startOfDay(date) }));
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      setFiltros(prev => ({ ...prev, endDate: endOfDay(date) }));
    }
  };

  const filteredFechamentos = fechamentos.filter(([_, fechamento]) => {
    const dataPagamento = parseISO(fechamento.dataPagamento);
    const dateInRange = isWithinInterval(dataPagamento, {
      start: filtros.startDate,
      end: filtros.endDate
    });

    const fornecedorMatch = filtros.fornecedor === 'Todos' || 
      fechamento.fornecedor === filtros.fornecedor;

    return dateInRange && fornecedorMatch;
  });

  // Ordenar por data de pagamento (mais recente primeiro)
  const sortedFechamentos = [...filteredFechamentos].sort((a, b) => {
    const dateA = parseISO(a[1].dataPagamento);
    const dateB = parseISO(b[1].dataPagamento);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Histórico de Fechamentos
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="fornecedor-select-label">Fornecedor</InputLabel>
              <Select
                labelId="fornecedor-select-label"
                value={filtros.fornecedor}
                label="Fornecedor"
                onChange={(e) => handleFornecedorChange(e as any)}
              >
                {fornecedores.map((fornecedor, index) => (
                  <MenuItem key={`hist-fornecedor-${index}-${fornecedor}`} value={fornecedor}>
                    {fornecedor}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Inicial"
                value={filtros.startDate}
                onChange={handleStartDateChange}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Final"
                value={filtros.endDate}
                onChange={handleEndDateChange}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              {sortedFechamentos.length} fechamentos encontrados
            </Typography>
          </Grid>
        </Grid>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : sortedFechamentos.length === 0 ? (
        <Alert severity="info">
          Não há fechamentos com os filtros selecionados.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table aria-label="collapsible table">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>ID</TableCell>
                <TableCell>Data de Registro</TableCell>
                <TableCell>Data de Pagamento</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell align="right">Valor Total</TableCell>
                <TableCell align="center">Pedidos</TableCell>
                <TableCell>Log</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedFechamentos.map(([id, fechamento], index) => (
                <Row key={`fechamento-${id}-${index}`} id={id} fechamento={fechamento} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
