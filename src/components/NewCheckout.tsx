import { useState, useEffect } from 'react';
import { ref, get, update, push, serverTimestamp } from 'firebase/database';
import { database } from '../config/firebase';
import { databaseProducao } from '../config/firebaseProducao';
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
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, addDays } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

interface Pedido {
  dataEnvio: string;
  fornecedor: string;
  valor: string;
  custo: string;
  tipo: string;
  status?: string;
  idFechamento?: string;
  historico?: Record<string, HistoricoItem>;
}

interface HistoricoItem {
  tipo: 'criacao' | 'edicao' | 'cancelamento' | 'fechamento';
  valorAnterior?: Partial<Pedido>;
  valorNovo?: Partial<Pedido>;
  usuario: string;
  data: number;
}

interface LogItem {
  tipo: 'criacao' | 'edicao' | 'cancelamento';
  usuario: string;
  data: number;
  detalhes: string;
}

export function NewCheckout() {
  const { currentUser } = useAuth();
  const [pedidos, setPedidos] = useState<[string, Pedido][]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>(['Todos']);
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('Todos');
  const [selectedPedidos, setSelectedPedidos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dataPagamento, setDataPagamento] = useState<Date | null>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const fetchPedidos = async () => {
      setLoading(true);
      try {
        const pedidosRef = ref(database, 'pedidos');
        const snapshot = await get(pedidosRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const pedidosArray = Object.entries(data) as [string, Pedido][];
          
          // Filtrar apenas pedidos personalizados ativos (não cancelados e não fechados)
          const filteredPedidos = pedidosArray.filter(([_, pedido]) => {
            return pedido.tipo === 'personalizada' && 
                  pedido.status !== 'cancelado' && 
                  !pedido.idFechamento;
          });

          // Extrair lista de fornecedores únicos
          const uniqueFornecedores = ['Todos', ...new Set(filteredPedidos.map(([_, p]) => p.fornecedor))];
          setFornecedores(uniqueFornecedores);
          
          setPedidos(filteredPedidos);
        }
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        setError('Erro ao carregar pedidos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const apiKeyRef = ref(databaseProducao, 'api/api');
        const snapshot = await get(apiKeyRef);
        if (snapshot.exists()) {
          setApiKey(snapshot.val());
        } else {
          console.error('API Key do Bling não encontrada. Caminho:', 'api/api');
          setError('API Key do Bling não encontrada');
        }
      } catch (error) {
        console.error('Erro ao buscar API Key:', error);
        setError('Erro ao buscar API Key do Bling');
      }
    };
    fetchApiKey();
  }, []);

  const handleFornecedorChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const fornecedor = event.target.value as string;
    setSelectedFornecedor(fornecedor);
    // Limpar seleção quando mudar o fornecedor
    setSelectedPedidos([]);
  };

  const handleCheckboxChange = (numeroPedido: string, pedido: Pedido) => {
    setSelectedPedidos(prev => {
      // Se já está selecionado, remover da lista
      if (prev.includes(numeroPedido)) {
        return prev.filter(id => id !== numeroPedido);
      }
      
      // Se é o primeiro pedido sendo selecionado, permitir qualquer fornecedor
      if (prev.length === 0) {
        return [...prev, numeroPedido];
      }
      
      // Verificar se o fornecedor é o mesmo dos outros pedidos selecionados
      const firstPedidoId = prev[0];
      const firstPedido = pedidos.find(([id, _]) => id === firstPedidoId)?.[1];
      
      if (firstPedido && firstPedido.fornecedor === pedido.fornecedor) {
        return [...prev, numeroPedido];
      } else {
        setError('Só é possível selecionar pedidos do mesmo fornecedor');
        return prev;
      }
    });
  };

  const handleConfirmCheckout = async () => {
    if (!currentUser || selectedPedidos.length === 0 || !dataPagamento) {
      setError('Selecione pelo menos um pedido e uma data de pagamento');
      return;
    }

    try {
      setLoading(true);

      // Calcular valor total
      const pedidosSelecionados = pedidos.filter(([id, _]) => selectedPedidos.includes(id));
      const valorTotal = pedidosSelecionados.reduce((total, [_, pedido]) => {
        return total + parseFloat(pedido.custo.replace(',', '.'));
      }, 0);
      
      const valorTotalFormatado = valorTotal.toFixed(2).replace('.', ',');
      const fornecedor = pedidosSelecionados[0][1].fornecedor;
      
      // Criar novo fechamento (ID apenas, não salvar ainda)
      const fechamentosRef = ref(database, 'fechamentos');
      const newFechamentoRef = push(fechamentosRef);
      const fechamentoId = newFechamentoRef.key;
      
      if (!fechamentoId) {
        throw new Error('Erro ao gerar ID do fechamento');
      }
      
      // Formatar datas
      const hoje = new Date();
      const dataVencimento = format(addDays(hoje, 2), 'yyyy-MM-dd');
      const dataHoje = format(hoje, 'yyyy-MM-dd');
      
      // Informações dos pedidos para o histórico
      const pedidosInfo = pedidosSelecionados.map(([id, pedido]) => ({
        numeroPedido: id,
        custo: pedido.custo,
        dataEnvio: pedido.dataEnvio
      }));
      
      // Preparar dados para o Bling
      const dadosBling = {
        vencimento: dataVencimento,
        valor: valorTotal,
        contato: {
          id: "16949456496" // ID fixo do fornecedor
        },
        categoria: {
          id: "14690272874" // ID da categoria
        },
        dataEmissao: dataHoje,
        competencia: dataHoje,
        historico: `Fechamento fornecedor ${fornecedor} - ${dataHoje}`
      };
      
      // Gera o comando curl equivalente
      const curlCommand = `curl -X POST 'https://api.bling.com.br/Api/v3/contas/pagar' \\
        -H 'Accept: application/json' \\
        -H 'Content-Type: application/json' \\
        -H 'Authorization: Bearer ${apiKey}' \\
        -d '${JSON.stringify(dadosBling, null, 2)}'`;
      
      // Envia requisição para o Bling
      const response = await fetch('/api/bling/Api/v3/contas/pagar', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(dadosBling)
      });

      // Obtém o texto bruto da resposta
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = null;
      }

      // Adiciona log no Firebase
      const logRef = ref(database, 'logs');
      await push(logRef, {
        tipo: 'bling_request',
        data: serverTimestamp(),
        curl_command: curlCommand,
        webhook_response: {
          status: response.status,
          statusText: response.statusText,
          raw_response: responseText,
          parsed_response: responseData
        }
      });

      // Só considera sucesso se o status for 200 ou 201
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Erro ao criar conta no Bling. Status: ${response.status} - ${response.statusText}\nResposta: ${responseText}`);
      }

      // Como não podemos ler a resposta, vamos usar um ID temporário
      const tempBlingId = `TEMP_${Date.now()}`;
      
      // Após sucesso no Bling, continuar com a criação do fechamento no Firebase
      // Log de criação
      const logItem: LogItem = {
        tipo: 'criacao',
        usuario: currentUser.email || 'usuário desconhecido',
        data: Date.now(),
        detalhes: `Fechamento criado com ${pedidosInfo.length} pedidos no valor total de R$ ${valorTotalFormatado}. Conta a pagar registrada no Bling.`
      };
      
      // Dados do fechamento
      const fechamentoData = {
        fornecedor,
        dataPagamento: dataVencimento,
        valorTotal: valorTotalFormatado,
        pedidos: pedidosInfo,
        usuario: currentUser.email || 'usuário desconhecido',
        dataRegistro: serverTimestamp(),
        log: [logItem],
        blingRegistro: {
          registrado: true,
          idContasPagar: tempBlingId,
          dataRegistro: dataHoje
        }
      };
      
      // Salvar fechamento no Firebase
      await update(newFechamentoRef, fechamentoData);
      
      // Atualizar cada pedido com o ID do fechamento
      for (const numeroPedido of selectedPedidos) {
        const pedidoRef = ref(database, `pedidos/${numeroPedido}`);
        const pedidoSnapshot = await get(pedidoRef);
        const pedido = pedidoSnapshot.val() as Pedido;
        
        // Adicionar ao histórico do pedido
        const historicoRef = ref(database, `pedidos/${numeroPedido}/historico`);
        const novoHistorico: HistoricoItem = {
          tipo: 'fechamento',
          valorAnterior: {
            status: pedido.status || 'ativo'
          },
          valorNovo: {
            status: 'fechado',
            idFechamento: fechamentoId
          },
          usuario: currentUser.email || 'usuário desconhecido',
          data: Date.now()
        };
        
        // Atualizar pedido
        await update(pedidoRef, {
          status: 'fechado',
          idFechamento: fechamentoId
        });
        
        // Adicionar ao histórico
        await push(historicoRef, novoHistorico);
      }
      
      // Limpar seleção e mostrar mensagem de sucesso
      setSelectedPedidos([]);
      setConfirmDialogOpen(false);
      setSuccess(`Fechamento criado com sucesso! ID: ${fechamentoId}. Conta a pagar registrada no Bling.`);
      
      // Recarregar pedidos para atualizar a lista
      const pedidosRef = ref(database, 'pedidos');
      const snapshot = await get(pedidosRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pedidosArray = Object.entries(data) as [string, Pedido][];
        
        // Filtrar apenas pedidos personalizados ativos (não cancelados e não fechados)
        const filteredPedidos = pedidosArray.filter(([_, pedido]) => {
          return pedido.tipo === 'personalizada' && 
                pedido.status !== 'cancelado' && 
                !pedido.idFechamento;
        });
        
        setPedidos(filteredPedidos);
      }
      
    } catch (error: unknown) {
      console.error('Erro ao processar fechamento:', error);
      setError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPedidos = selectedFornecedor === 'Todos' 
    ? pedidos 
    : pedidos.filter(([_, pedido]) => pedido.fornecedor === selectedFornecedor);

  const totalSelecionado = pedidos
    .filter(([id, _]) => selectedPedidos.includes(id))
    .reduce((total, [_, pedido]) => {
      return total + parseFloat(pedido.custo.replace(',', '.'));
    }, 0)
    .toFixed(2)
    .replace('.', ',');

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Selecione os pedidos para fechamento
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="fornecedor-select-label">Fornecedor</InputLabel>
          <Select
            labelId="fornecedor-select-label"
            value={selectedFornecedor}
            label="Fornecedor"
            onChange={(e) => handleFornecedorChange(e as any)}
          >
            {fornecedores.map((fornecedor, index) => (
              <MenuItem key={`fornecedor-${index}-${fornecedor}`} value={fornecedor}>
                {fornecedor}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1">
            Total selecionado: R$ {totalSelecionado}
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            disabled={selectedPedidos.length === 0}
            onClick={() => setConfirmDialogOpen(true)}
          >
            Gerar Fechamento ({selectedPedidos.length})
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : filteredPedidos.length === 0 ? (
        <Alert severity="info">
          Não há pedidos disponíveis para fechamento com os filtros selecionados.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox 
                    indeterminate={selectedPedidos.length > 0 && selectedPedidos.length < filteredPedidos.length}
                    checked={selectedPedidos.length > 0 && selectedPedidos.length === filteredPedidos.length}
                    onChange={() => {
                      if (selectedPedidos.length === filteredPedidos.length) {
                        setSelectedPedidos([]);
                      } else {
                        // Verificar se todos são do mesmo fornecedor
                        const firstFornecedor = filteredPedidos[0][1].fornecedor;
                        const allSameFornecedor = filteredPedidos.every(([_, p]) => p.fornecedor === firstFornecedor);
                        
                        if (allSameFornecedor || selectedFornecedor !== 'Todos') {
                          setSelectedPedidos(filteredPedidos.map(([id, _]) => id));
                        } else {
                          setError('Só é possível selecionar pedidos do mesmo fornecedor');
                        }
                      }
                    }}
                  />
                </TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell align="right">Custo (R$)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPedidos.map(([numero, pedido]) => (
                <TableRow key={numero} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedPedidos.includes(numero)}
                      onChange={() => handleCheckboxChange(numero, pedido)}
                    />
                  </TableCell>
                  <TableCell>{numero}</TableCell>
                  <TableCell>{format(parseISO(pedido.dataEnvio), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{pedido.fornecedor}</TableCell>
                  <TableCell align="right">{pedido.custo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Dialog de confirmação */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirmar Fechamento</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              Você está prestes a gerar um fechamento para {selectedPedidos.length} pedidos
              no custo total de R$ {totalSelecionado}.
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Esta ação não poderá ser desfeita e os pedidos serão marcados como fechados.
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data de Pagamento"
                  value={dataPagamento}
                  onChange={(newValue) => setDataPagamento(newValue)}
                />
              </LocalizationProvider>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmCheckout} variant="contained" color="primary">
            Confirmar Fechamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
