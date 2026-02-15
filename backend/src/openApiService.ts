import axios from 'axios';
import { Endpoint } from './agent/endpointExtractor';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

interface OpenAPIPaths {
  [path: string]: {
    get?: { security?: unknown[] };
    post?: { security?: unknown[] };
    put?: { security?: unknown[] };
    delete?: { security?: unknown[] };
    patch?: { security?: unknown[] };
    head?: { security?: unknown[] };
    options?: { security?: unknown[] };
  };
}

interface OpenAPISpec {
  paths?: OpenAPIPaths;
  openapi?: string;
  swagger?: string;
}

/**
 * Fetch OpenAPI/Swagger spec from URL and return list of endpoints.
 */
export async function discoverEndpointsFromOpenApi(openApiUrl: string): Promise<Endpoint[]> {
  const response = await axios.get(openApiUrl, {
    timeout: 15000,
    responseType: 'json',
    headers: { Accept: 'application/json, application/yaml' },
  });

  let spec: OpenAPISpec = response.data;
  if (typeof spec === 'string') {
    try {
      spec = JSON.parse(spec);
    } catch {
      throw new Error('OpenAPI spec is not valid JSON. YAML not supported in this version.');
    }
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    throw new Error('Invalid OpenAPI spec: missing or invalid "paths"');
  }

  const endpoints: Endpoint[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    if (!path.startsWith('/')) continue;

    for (const method of HTTP_METHODS) {
      const op = (pathItem as Record<string, unknown>)[method];
      if (!op || typeof op !== 'object') continue;

      const authRequired = Array.isArray((op as { security?: unknown[] }).security) &&
        (op as { security: unknown[] }).security.length > 0;

      endpoints.push({
        method: method.toUpperCase(),
        path,
        file: openApiUrl,
        authRequired,
      });
    }
  }

  return endpoints;
}
