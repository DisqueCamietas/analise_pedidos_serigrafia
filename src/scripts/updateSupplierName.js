import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDi83NC22gAVMORYWdqiUs0YkEyfrAk_iY",
  authDomain: "extensao-pedidos-serigrafia.firebaseapp.com",
  databaseURL: "https://extensao-pedidos-serigrafia-default-rtdb.firebaseio.com",
  projectId: "extensao-pedidos-serigrafia",
  storageBucket: "extensao-pedidos-serigrafia.firebasestorage.app",
  messagingSenderId: "374388682446",
  appId: "1:374388682446:web:8dc5ac6fb865ce29abea9f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function updateSupplierName() {
  try {
    // Referência para a coleção de pedidos
    const pedidosRef = ref(database, 'pedidos');
    
    // Buscar todos os pedidos
    const snapshot = await get(pedidosRef);
    
    if (!snapshot.exists()) {
      console.log('Nenhum pedido encontrado');
      return;
    }

    const updates = {};
    let countUpdated = 0;

    // Iterar sobre todos os pedidos
    Object.entries(snapshot.val()).forEach(([pedidoId, pedido]) => {
      if (pedido.fornecedor === 'Alianza Estamparia - Scheila') {
        updates[`${pedidoId}/fornecedor`] = 'Alianza Estamparia';
        countUpdated++;
      }
    });

    // Se houver atualizações para fazer
    if (Object.keys(updates).length > 0) {
      // Fazer todas as atualizações em uma única operação
      await update(pedidosRef, updates);
      console.log(`Atualizado com sucesso! ${countUpdated} pedidos foram atualizados.`);
    } else {
      console.log('Nenhum pedido precisou ser atualizado.');
    }

  } catch (error) {
    console.error('Erro ao atualizar pedidos:', error);
  }
}

// Executar o script
updateSupplierName().then(() => {
  console.log('Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('Erro ao executar o script:', error);
  process.exit(1);
});
