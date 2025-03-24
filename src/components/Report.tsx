import { useEffect, useState } from 'react';
import { ref, get, update, push, serverTimestamp } from 'firebase/database';
import { database } from '../config/firebase';
import { FilterValues } from './Filters';
import { useAuth } from '../contexts/AuthContext';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import HistoryIcon from '@mui/icons-material/History';

interface Pedido {
  dataEnvio: string;
  fornecedor: string;
  valor: string;
  custo: string;
  tipo: string;
  status?: string;
  historico?: Record<string, HistoricoItem>;
}

interface HistoricoItem {
  tipo: 'criacao' | 'edicao' | 'cancelamento';
  valorAnterior?: Partial<Pedido>;
  valorNovo?: Partial<Pedido>;
  usuario: string;
  data: number;
}

interface ReportProps {
  filters: FilterValues;
}

export function Report({ filters }: ReportProps) {
  const { currentUser } = useAuth();
  const [pedidos, setPedidos] = useState<[string, Pedido][]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<[string, Pedido] | null>(null);
  const [editValues, setEditValues] = useState({ valor: '', custo: '' });

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
            
            // Filtrar pedidos cancelados se o status não for "cancelado"
            if (pedido.status === 'cancelado' && filters.status !== 'cancelado') return false;
            
            const pedidoDate = parseISO(pedido.dataEnvio);
            const dateInRange = isWithinInterval(pedidoDate, {
              start: startOfDay(filters.startDate),
              end: endOfDay(filters.endDate)
            });

            const fornecedorMatch = filters.fornecedor === 'Todos' || 
              pedido.fornecedor === filters.fornecedor;

            const statusMatch = 
              filters.status === 'cancelado' ? pedido.status === 'cancelado' :
              filters.status === 'aberto' ? !pedido.custo && pedido.status !== 'cancelado' : 
              pedido.custo && pedido.status !== 'cancelado';

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

  const handleEditClick = (pedido: [string, Pedido]) => {
    setSelectedPedido(pedido);
    setEditValues({
      valor: pedido[1].valor,
      custo: pedido[1].custo || ''
    });
    setEditDialogOpen(true);
  };

  const handleCancelClick = (pedido: [string, Pedido]) => {
    setSelectedPedido(pedido);
    setCancelDialogOpen(true);
  };

  const handleHistoryClick = (pedido: [string, Pedido]) => {
    setSelectedPedido(pedido);
    setHistoryDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedPedido || !currentUser) return;
    
    const [numero, pedido] = selectedPedido;
    const pedidoRef = ref(database, `pedidos/${numero}`);
    
    // Criar registro no histórico
    const historicoRef = ref(database, `pedidos/${numero}/historico`);
    const novoHistorico: HistoricoItem = {
      tipo: 'edicao',
      valorAnterior: {
        valor: pedido.valor,
        custo: pedido.custo
      },
      valorNovo: {
        valor: editValues.valor,
        custo: editValues.custo
      },
      usuario: currentUser.email || 'usuário desconhecido',
      data: Date.now()
    };
    
    try {
      // Atualizar o pedido com os novos valores
      await update(pedidoRef, {
        valor: editValues.valor,
        custo: editValues.custo,
        status: pedido.status || 'ativo'
      });
      
      // Adicionar ao histórico
      await push(historicoRef, novoHistorico);
      
      // Atualizar a lista de pedidos
      setPedidos(prevPedidos => 
        prevPedidos.map(([id, p]) => 
          id === numero 
            ? [id, { ...p, valor: editValues.valor, custo: editValues.custo }] 
            : [id, p]
        )
      );
      
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Erro ao editar pedido:', error);
    }
  };

  const handleCancelConfirm = async () => {
    if (!selectedPedido || !currentUser) return;
    
    const [numero, pedido] = selectedPedido;
    const pedidoRef = ref(database, `pedidos/${numero}`);
    
    // Criar registro no histórico
    const historicoRef = ref(database, `pedidos/${numero}/historico`);
    const novoHistorico: HistoricoItem = {
      tipo: 'cancelamento',
      valorAnterior: {
        status: pedido.status || 'ativo'
      },
      valorNovo: {
        status: 'cancelado'
      },
      usuario: currentUser.email || 'usuário desconhecido',
      data: Date.now()
    };
    
    try {
      // Atualizar o status do pedido para cancelado
      await update(pedidoRef, {
        status: 'cancelado'
      });
      
      // Adicionar ao histórico
      await push(historicoRef, novoHistorico);
      
      // Atualizar a lista de pedidos
      setPedidos(prevPedidos => 
        prevPedidos.map(([id, p]) => 
          id === numero 
            ? [id, { ...p, status: 'cancelado' }] 
            : [id, p]
        )
      );
      
      setCancelDialogOpen(false);
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
    }
  };

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

  const formatarData = (timestamp: number) => {
    return format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss');
  };

  const pedidoFoiEditado = (pedido: Pedido) => {
    if (!pedido.historico) return false;
    
    // Verifica se existe algum registro de edição no histórico
    return Object.values(pedido.historico).some(item => item.tipo === 'edicao');
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
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidos.map(([numero, pedido]) => (
              <TableRow 
                key={numero}
                sx={{
                  backgroundColor: pedido.status === 'cancelado' ? 'rgba(244, 67, 54, 0.1)' : 'inherit'
                }}
              >
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
                <TableCell align="center">
                  {pedido.status === 'cancelado' ? (
                    <Chip label="Cancelado" color="error" size="small" />
                  ) : (
                    <Chip label="Ativo" color="success" size="small" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Tooltip title="Editar">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditClick([numero, pedido])}
                        disabled={pedido.status === 'cancelado'}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancelar">
                      <IconButton 
                        size="small" 
                        onClick={() => handleCancelClick([numero, pedido])}
                        disabled={pedido.status === 'cancelado'}
                        color="error"
                      >
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={pedidoFoiEditado(pedido) ? "Histórico (Editado)" : "Histórico"}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleHistoryClick([numero, pedido])}
                        color={pedidoFoiEditado(pedido) ? "primary" : "default"}
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Editar Pedido {selectedPedido?.[0]}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Valor de Venda"
              fullWidth
              margin="normal"
              value={editValues.valor}
              onChange={(e) => setEditValues({ ...editValues, valor: e.target.value })}
              placeholder="0,00"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
              }}
            />
            <TextField
              label="Custo"
              fullWidth
              margin="normal"
              value={editValues.custo}
              onChange={(e) => setEditValues({ ...editValues, custo: e.target.value })}
              placeholder="0,00"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cancelamento */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancelar Pedido</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja cancelar o pedido {selectedPedido?.[0]}?
          </Typography>
          <Typography variant="caption" color="error">
            Esta ação não pode ser desfeita, mas o pedido não será excluído.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Voltar</Button>
          <Button onClick={handleCancelConfirm} variant="contained" color="error">Confirmar Cancelamento</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Histórico do Pedido {selectedPedido?.[0]}</DialogTitle>
        <DialogContent>
          {selectedPedido && selectedPedido[1].historico ? (
            <List>
              {Object.entries(selectedPedido[1].historico).map(([key, item]) => (
                <Box key={key}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1">
                          {item.tipo === 'criacao' ? 'Criação' : 
                           item.tipo === 'edicao' ? 'Edição' : 'Cancelamento'}
                          {' - '}{formatarData(item.data)}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Usuário: {item.usuario}
                          </Typography>
                          {item.tipo === 'edicao' && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption">Alterações:</Typography>
                              <Box sx={{ display: 'flex', mt: 0.5 }}>
                                <Box sx={{ mr: 4 }}>
                                  <Typography variant="caption">Anterior:</Typography>
                                  <Typography variant="body2">
                                    Valor: R$ {item.valorAnterior?.valor}
                                  </Typography>
                                  <Typography variant="body2">
                                    Custo: {item.valorAnterior?.custo ? `R$ ${item.valorAnterior.custo}` : '-'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption">Novo:</Typography>
                                  <Typography variant="body2">
                                    Valor: R$ {item.valorNovo?.valor}
                                  </Typography>
                                  <Typography variant="body2">
                                    Custo: {item.valorNovo?.custo ? `R$ ${item.valorNovo.custo}` : '-'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          )}
                          {item.tipo === 'cancelamento' && (
                            <Typography variant="body2" color="error">
                              Pedido cancelado
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </Box>
              ))}
            </List>
          ) : (
            <Typography>Nenhum histórico disponível para este pedido.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
