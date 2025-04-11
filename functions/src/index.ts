import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch"; // Ensure v2 is installed
import * as cors from "cors";

// --- Configuração Inicial --- //

// Inicializa o app Firebase principal (onde a função roda)
admin.initializeApp();

// Configuração para o app Firebase secundário (onde a API key está)
const secondaryAppConfig = {
  databaseURL: "https://sistema-producao-default-rtdb.firebaseio.com/",
  // Adicione outras credenciais se necessário (ex: serviceAccount)
  // Se estiver usando a mesma conta de serviço da função principal com permissões
  // no projeto secundário, geralmente não precisa de credenciais explícitas aqui.
};

// Caminho para a API key no Realtime Database do projeto secundário
const API_KEY_PATH = "/api/api"; // Ex: /config/bling ou /secrets/blingApiKey

let secondaryApp: admin.app.App | null = null;
try {
  secondaryApp = admin.initializeApp(secondaryAppConfig, "secondary");
  functions.logger.info("Secondary Firebase app initialized successfully.");
} catch (error) {
  functions.logger.error("Failed to initialize secondary Firebase app:", error);
  // A função ainda pode tentar rodar, mas falhará ao buscar a key
}

// Configura o CORS para permitir requisições do seu domínio de frontend
// Substitua '*' por seu domínio específico em produção para segurança!
const corsHandler = cors({origin: true}); // Permite todas as origens temporariamente para teste
// Exemplo mais seguro: cors({ origin: "https://seu-app.firebaseapp.com" });

// --- Função Principal: blingProxy --- //
export const blingProxy = functions
  // Considere definir a região mais próxima dos seus usuários ou do Bling
  // Ex: .region("southamerica-east1") // São Paulo
  .https.onRequest(async (request, response) => {
    // Aplica o middleware CORS primeiro
    corsHandler(request, response, async () => {
      // 1. Verifica o método HTTP (somente POST)
      if (request.method !== "POST") {
        functions.logger.warn("Method Not Allowed:", request.method);
        response.status(405).send("Method Not Allowed");
        return;
      }

      // 2. Verifica se a instância do app secundário está disponível
      if (!secondaryApp) {
        functions.logger.error("Internal Server Error: Secondary Firebase app instance is not available.");
        response.status(500).send("Internal Server Error: Secondary app connection failed.");
        return;
      }

      let apiKey: string | null = null;
      try {
        // 3. Busca a API Key do Firebase RTDB secundário
        const db = admin.database(secondaryApp); // Usa a instância secundária
        const snapshot = await db.ref(API_KEY_PATH).once("value");
        const apiKeyData = snapshot.val() as { key?: unknown }; // Type assertion

        // Verifica se o dado existe e se a propriedade 'key' é uma string válida
        if (apiKeyData && typeof apiKeyData.key === 'string' && apiKeyData.key.trim() !== '') {
            apiKey = apiKeyData.key.trim();
            functions.logger.info("API Key successfully retrieved from secondary DB.");
        } else {
            functions.logger.error("API Key not found or is invalid at path:", API_KEY_PATH, "Data found:", JSON.stringify(apiKeyData));
            throw new Error("API Key configuration error in secondary database. Expected structure: { key: '...' } at path " + API_KEY_PATH);
        }

        // 4. Valida o corpo da requisição do frontend (opcional, mas recomendado)
        const requestBody = request.body as Record<string, unknown>; // Use Record<string, unknown> em vez de any
        if (!requestBody || typeof requestBody !== 'object') {
            functions.logger.warn("Invalid request body received.");
            response.status(400).send("Bad Request: Invalid request body.");
            return;
        }
        // Adicione validações mais específicas para 'dadosBling' se necessário
        // Ex: if (!requestBody.vencimento || !requestBody.valor || !requestBody.contato?.id) ...

        // 5. Faz a chamada para a API do Bling
        const blingApiUrl = "https://api.bling.com.br/Api/v3/contas/pagar";
        functions.logger.info("Making request to Bling API:", blingApiUrl);

        const blingResponse = await fetch(blingApiUrl, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody), // Envia o corpo recebido do frontend
        });

        // 6. Processa a resposta do Bling
        const responseStatus = blingResponse.status;
        const responseBodyText = await blingResponse.text();
        let responseBodyJson: unknown = null; // Use unknown
        try {
            if (responseBodyText) {
                responseBodyJson = JSON.parse(responseBodyText);
                functions.logger.debug("Parsed Bling response JSON:", responseBodyJson);
            }
        } catch (parseError) {
            const errorDetails = parseError instanceof Error ? parseError.message : String(parseError);
            functions.logger.warn("Bling response is not valid JSON:", responseBodyText, "Parse Error:", errorDetails);
            // Continua, mas a resposta será o texto bruto
        }

        functions.logger.info("Received response from Bling API. Status:", responseStatus);

        // 7. Retorna a resposta do Bling para o frontend
        // Define o Content-Type da resposta da função como JSON (mesmo que o corpo seja texto às vezes)
        response.status(responseStatus).contentType('application/json').send(responseBodyText);

      } catch (error: unknown) { // Use unknown para o erro
        functions.logger.error("Error in blingProxy function:", error);
        let errorMessage = "Internal Server Error while contacting Bling API.";
        // Verifica se é um erro nosso de configuração
        if (error instanceof Error && error.message?.includes("API Key configuration error")) {
            errorMessage = "Internal Server Error: Configuration issue.";
        }
        // Evita vazar detalhes internos no erro
        response.status(500).send({ error: errorMessage });
      }
    });
  });
