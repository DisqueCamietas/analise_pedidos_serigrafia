// ESM syntax
import fetch from 'node-fetch';

// Função serverless do Vercel
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Responder imediatamente às solicitações OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verificar se é uma solicitação POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Extrair o caminho da API do Bling da URL
    const pathParts = req.url.split('/api/bling');
    const blingPath = pathParts.length > 1 ? pathParts[1] : '';
    const blingApiUrl = `https://api.bling.com.br${blingPath}`;
    
    console.log('Requisição para o Bling:', {
      url: blingApiUrl,
      method: req.method
    });

    // Extrair o corpo da requisição
    const body = req.body;
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({ error: 'Authorization header is required' });
    }

    // Fazer a requisição para a API do Bling
    const blingResponse = await fetch(blingApiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authorization
      },
      body: JSON.stringify(body)
    });

    // Obter a resposta como texto
    const responseText = await blingResponse.text();
    
    console.log('Resposta da API do Bling:', {
      status: blingResponse.status,
      statusText: blingResponse.statusText
    });

    // Tentar converter para JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }

    // Retornar a resposta com o mesmo status
    return res.status(blingResponse.status).json(responseData);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}
