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
      return;
    }

    const pedidos = snapshot.val();
    let countUpdated = 0;

    for (const [pedidoId, pedido] of Object.entries(pedidos) as [string, { fornecedor: string }][]) {
      if (pedido.fornecedor === 'Alianza Estamparia - Scheila') {
        await update(ref(database, `pedidos/${pedidoId}`), {
          fornecedor: 'Alianza Estamparia'
        });
        countUpdated++;
      }
    }

    if (countUpdated === 0) {
      return;
    }

    process.exit(0);

  } catch (error) {
    process.exit(1);
  }
}

// Executar o script
updateSupplierName();
