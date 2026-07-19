import { AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai";

export type AzureOpenAIConfig = {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  instanceName: string;
  chatDeployment: string;
  realtimeDeployment: string;
  embeddingDeployment: string;
};

export type AzureRealtimeConfig = {
  deployment: string;
  webSocketUrl: string;
  clientSecretsUrl: string;
  callsUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseInstanceName(endpoint: string): string {
  const hostname = new URL(endpoint).hostname;
  const instanceName = hostname.split(".")[0];
  if (!instanceName) {
    throw new Error(
      `Could not parse Azure OpenAI instance name from endpoint: ${endpoint}`,
    );
  }
  return instanceName;
}

function buildAzureUrl(endpoint: string, path: string): string {
  return new URL(path, endpoint).toString();
}

export function getAzureConfig(): AzureOpenAIConfig {
  const endpoint = requireEnv("AZURE_OPENAI_ENDPOINT");

  return {
    endpoint,
    apiKey: requireEnv("AZURE_OPENAI_API_KEY"),
    apiVersion: requireEnv("AZURE_OPENAI_API_VERSION"),
    instanceName: parseInstanceName(endpoint),
    chatDeployment: requireEnv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
    realtimeDeployment: requireEnv("AZURE_OPENAI_REALTIME_DEPLOYMENT"),
    embeddingDeployment: requireEnv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
  };
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getAzureRealtimeCredentials(): {
  endpoint: string;
  apiKey: string;
  deployment: string;
} {
  const config = getAzureConfig();
  return {
    endpoint: optionalEnv("AZURE_OPENAI_REALTIME_ENDPOINT") ?? config.endpoint,
    apiKey: optionalEnv("AZURE_OPENAI_REALTIME_API_KEY") ?? config.apiKey,
    deployment: config.realtimeDeployment,
  };
}

export function getAzureRealtimeConfig(): AzureRealtimeConfig {
  const { endpoint, deployment } = getAzureRealtimeCredentials();
  const webSocketUrl = new URL(
    `/openai/v1/realtime?model=${encodeURIComponent(deployment)}`,
    endpoint,
  );
  webSocketUrl.protocol = "wss:";

  return {
    deployment,
    webSocketUrl: webSocketUrl.toString(),
    clientSecretsUrl: buildAzureUrl(
      endpoint,
      "/openai/v1/realtime/client_secrets",
    ),
    callsUrl: buildAzureUrl(endpoint, "/openai/v1/realtime/calls"),
  };
}

export function getAzureChatModel() {
  const config = getAzureConfig();

  return new AzureChatOpenAI({
    azureOpenAIApiKey: config.apiKey,
    azureOpenAIApiInstanceName: config.instanceName,
    azureOpenAIApiDeploymentName: config.chatDeployment,
    azureOpenAIApiVersion: config.apiVersion,
  });
}

export function getAzureEvaluatorModel() {
  const config = getAzureConfig();

  return new AzureChatOpenAI({
    azureOpenAIApiKey: config.apiKey,
    azureOpenAIApiInstanceName: config.instanceName,
    azureOpenAIApiDeploymentName: config.chatDeployment,
    azureOpenAIApiVersion: config.apiVersion,
  });
}

/** @deprecated Use getAzureEvaluatorModel */
export const getAzureAgenticModel = getAzureEvaluatorModel;

export function getAzureEmbeddings() {
  const config = getAzureConfig();

  return new AzureOpenAIEmbeddings({
    azureOpenAIApiKey: config.apiKey,
    azureOpenAIApiInstanceName: config.instanceName,
    azureOpenAIApiEmbeddingsDeploymentName: config.embeddingDeployment,
    azureOpenAIApiVersion: config.apiVersion,
  });
}